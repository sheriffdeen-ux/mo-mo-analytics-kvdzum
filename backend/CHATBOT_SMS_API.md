# MoMo Chatbot SMS Analysis API Documentation

## Overview

This API provides comprehensive SMS transaction analysis for Ghana Mobile Money (MoMo) providers with AI-powered fraud detection and templated chatbot replies.

## Authentication

All endpoints require Bearer token authentication in the format:
```
Authorization: Bearer userId:email:timestamp
```

Example:
```
Authorization: Bearer user_123:john@example.com:1234567890
```

## Base Endpoints

### 1. Analyze SMS Message
**Endpoint:** `POST /api/chatbot/sms/analyze`

**Description:** Analyze an SMS message and return fraud detection analysis with templated chatbot reply.

**Request:**
```json
{
  "smsMessage": "MTN: Sent GHS 100 to John. Ref: ABC123. Balance: GHS 500. Time: 14:30"
}
```

**Response (Success):**
```json
{
  "success": true,
  "chatbotReply": "Amount: GHS 100.00\nRecipient: John\nTime: 2:30 PM\nRisk Score: 15/100\n✅ Transaction appears legitimate.",
  "transaction": {
    "id": "uuid-123",
    "provider": "MTN",
    "transactionType": "sent",
    "amount": 100,
    "recipient": "John",
    "referenceNumber": "ABC123",
    "balance": 500,
    "time": "2:30 PM",
    "date": "15/01/2024"
  },
  "analysis": {
    "riskScore": 15,
    "riskLevel": "LOW",
    "shouldAlert": false,
    "alertLevel": "LOW",
    "processingTimeMs": 145,
    "breakdown": {
      "layer1": {
        "status": "PASS",
        "provider": "MTN",
        "type": "sent"
      },
      "layer3": {
        "nlpScore": 5,
        "scamKeywords": [],
        "sentiment": "neutral"
      },
      "layer4": {
        "velocityScore": 0,
        "anomalyDetected": false
      },
      "layer5": {
        "riskScore": 15,
        "riskLevel": "LOW",
        "breakdown": {
          "amountScore": 0,
          "timeScore": 0,
          "velocityScore": 0,
          "nlpScore": 5,
          "blacklistScore": 0,
          "roundAmountBonus": 0,
          "anomalyBonus": 0
        }
      }
    }
  }
}
```

**Response (Invalid SMS):**
```json
{
  "success": false,
  "error": "This doesn't appear to be a MoMo transaction SMS",
  "details": {
    "parseErrors": [
      "Provider not detected",
      "Amount not found"
    ],
    "rawSms": "Click here to claim your prize!"
  }
}
```

**Status Codes:**
- `200` - Successfully analyzed
- `400` - Invalid request or not a MoMo transaction
- `401` - Unauthorized (missing or invalid token)

---

### 2. Get Transaction History
**Endpoint:** `GET /api/chatbot/sms/transaction-history`

**Description:** Retrieve paginated list of user's analyzed transactions.

**Query Parameters:**
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20, max: 100) - Items per page
- `riskLevel` (optional) - Filter by risk level: LOW, MEDIUM, HIGH, CRITICAL
- `provider` (optional) - Filter by provider: MTN, Vodafone, AirtelTigo

**Example Request:**
```
GET /api/chatbot/sms/transaction-history?page=1&limit=20&riskLevel=HIGH
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "userId": "user_456",
      "rawSms": "MTN: Sent GHS 100...",
      "provider": "MTN",
      "transactionType": "sent",
      "amount": "100",
      "recipient": "John",
      "balance": "500",
      "transactionDate": "2024-01-15T14:30:00Z",
      "riskScore": 15,
      "riskLevel": "LOW",
      "createdAt": "2024-01-15T14:30:00Z",
      "updatedAt": "2024-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Status Codes:**
- `200` - Successfully retrieved
- `401` - Unauthorized

---

### 3. Get Transaction Details
**Endpoint:** `GET /api/chatbot/sms/transaction/:transactionId`

**Description:** Retrieve full details of a specific analyzed transaction.

**Example Request:**
```
GET /api/chatbot/sms/transaction/uuid-123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-123",
    "userId": "user_456",
    "rawSms": "MTN: Sent GHS 100...",
    "provider": "MTN",
    "transactionType": "sent",
    "amount": "100",
    "recipient": "John",
    "balance": "500",
    "transactionDate": "2024-01-15T14:30:00Z",
    "riskScore": 15,
    "riskLevel": "LOW",
    "riskReasons": ["lowAmount"],
    "layer1SmsRaw": "MTN: Sent GHS 100...",
    "layer2ValidationStatus": "PASS",
    "layer3NlpScore": "5",
    "layer3ScamKeywords": [],
    "layer4VelocityScore": "0",
    "layer4AnomalyDetected": false,
    "layer5RiskBreakdown": {...},
    "layer6AlertLevel": "LOW",
    "layer7AuditTrail": {...},
    "createdAt": "2024-01-15T14:30:00Z",
    "updatedAt": "2024-01-15T14:30:00Z"
  }
}
```

**Status Codes:**
- `200` - Successfully retrieved
- `404` - Transaction not found
- `403` - Unauthorized (accessing another user's transaction)
- `401` - Unauthorized

---

### 4. Dashboard Statistics
**Endpoint:** `GET /api/chatbot/stats/dashboard`

**Description:** Get comprehensive dashboard statistics for user transactions.

**Example Request:**
```
GET /api/chatbot/stats/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "count": 5,
      "totalAmount": 1250.50,
      "flaggedCount": 1,
      "avgAmount": 250.10
    },
    "allTime": {
      "count": 150,
      "totalAmount": 45300.00,
      "flaggedCount": 12,
      "avgAmount": 302.00,
      "flaggedPercentage": 8.00
    },
    "distribution": {
      "riskLevel": {
        "LOW": 130,
        "MEDIUM": 8,
        "HIGH": 10,
        "CRITICAL": 2
      },
      "provider": {
        "MTN": 85,
        "Vodafone": 45,
        "AirtelTigo": 20
      },
      "transactionType": {
        "sent": 60,
        "received": 50,
        "withdrawal": 20,
        "deposit": 10,
        "airtime": 8,
        "bill_payment": 2
      }
    },
    "alerts": {
      "total": 12,
      "unread": 3
    },
    "recentTransactions": [
      {
        "id": "uuid-1",
        "amount": "500",
        "recipient": "Mary",
        "riskLevel": "MEDIUM",
        "transactionDate": "2024-01-15T18:30:00Z"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Successfully retrieved
- `401` - Unauthorized

---

### 5. Fraud Report
**Endpoint:** `GET /api/chatbot/stats/fraud-report`

**Description:** Generate fraud report for a specified date range.

**Query Parameters:**
- `startDate` (optional) - ISO 8601 format (default: 30 days ago)
- `endDate` (optional) - ISO 8601 format (default: today)

**Example Request:**
```
GET /api/chatbot/stats/fraud-report?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "report": {
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    },
    "summary": {
      "totalTransactions": 150,
      "totalAmount": 45300.00,
      "fraudCount": 12,
      "fraudAmount": 8500.00,
      "fraudPercentage": 8.00
    },
    "topFlaggedRecipients": [
      {
        "recipient": "Merchant A",
        "flagCount": 3,
        "totalAmount": 2500.00
      },
      {
        "recipient": "Merchant B",
        "flagCount": 2,
        "totalAmount": 1800.00
      }
    ],
    "commonKeywords": [
      {
        "keyword": "urgent",
        "count": 5
      },
      {
        "keyword": "verify",
        "count": 3
      }
    ],
    "dailyBreakdown": [
      {
        "date": "2024-01-01",
        "totalTransactions": 5,
        "fraudTransactions": 1,
        "totalAmount": 1200.00
      },
      {
        "date": "2024-01-02",
        "totalTransactions": 4,
        "fraudTransactions": 0,
        "totalAmount": 950.50
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Successfully retrieved
- `401` - Unauthorized

---

## Chatbot Reply Format

The chatbot reply follows this exact template:

```
Amount: GHS {amount}
Recipient: {recipient}
Time: {time}
Risk Score: {score}/100
{emoji} {reason}
```

**Examples:**

**Low Risk:**
```
Amount: GHS 100.00
Recipient: John
Time: 2:30 PM
Risk Score: 15/100
✅ Transaction appears legitimate.
```

**High Risk:**
```
Amount: GHS 8000.00
Recipient: Unknown Merchant
Time: 2:30 AM
Risk Score: 72/100
⚠️ Suspicious activity detected. Review carefully before proceeding.
```

**Critical Risk:**
```
Amount: GHS 5000.00
Recipient: Blacklisted#123
Time: 3:00 AM
Risk Score: 88/100
⚠️ Multiple high-risk indicators detected. DO NOT PROCEED.
```

---

## Risk Scoring Breakdown

The risk score (0-100) is calculated from:

1. **Amount Score** (0-60 points)
   - < GHS 100: 0 pts
   - GHS 100-500: 20 pts
   - GHS 500-2000: 40 pts
   - > GHS 2000: 60 pts

2. **Time Score** (0-40 points)
   - 00:00-05:00 (midnight): 40 pts
   - 22:00-24:00 (late night): 20 pts
   - Other times: 0 pts

3. **Velocity Score** (0-30 points)
   - 3+ transactions/hour: 20 pts
   - 5+ transactions/3 hours: 30 pts

4. **Behavioral Anomaly** (0-25 points)
   - Amount 3x user's average: 25 pts

5. **Blacklist Score** (0-60 points)
   - Blacklisted recipient: 60 pts

6. **NLP Score** (0-100 points)
   - Scam keywords detected
   - Suspicious URLs detected
   - Negative sentiment

7. **Round Amount Bonus** (15 points)
   - Round numbers (100, 500, 1000): 15 pts

---

## Risk Levels

| Level | Score | Action | Emoji |
|-------|-------|--------|-------|
| LOW | 0-39 | Allow | ✅ |
| MEDIUM | 40-59 | Monitor | ⚠️ |
| HIGH | 60-79 | Review | ⚠️ |
| CRITICAL | 80-100 | Block | ⚠️ |

---

## MoMo Provider Support

### Supported Providers
- **MTN MoMo** - MTN Mobile Money (Ghana)
- **Vodafone Cash** - Vodafone Mobile Money (Ghana)
- **AirtelTigo Money** - Airtel/Tigo Mobile Money (Ghana)

### Phone Number Formats
- `0XX XXXXXXX` (e.g., 024 1234567)
- `0XXXXXXXXX` (e.g., 0241234567)
- `+233XX XXXXXXX` (e.g., +233241234567)

### Transaction Types
- `sent` - Money transferred
- `received` - Money received
- `withdrawal` - Cash withdrawal
- `deposit` - Cash deposit
- `airtime` - Airtime purchase
- `bill_payment` - Bill payment

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {}
}
```

### Common Errors

**Invalid SMS:**
```json
{
  "success": false,
  "error": "This doesn't appear to be a MoMo transaction SMS",
  "details": {
    "parseErrors": ["Provider not detected", "Amount not found"],
    "rawSms": "Original SMS text"
  }
}
```

**Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Invalid Token:**
```json
{
  "success": false,
  "error": "Invalid token format"
}
```

---

## Rate Limiting

All endpoints have rate limiting:
- **SMS Analysis:** 100 requests per hour per user
- **Other Endpoints:** Standard API rate limits apply

---

## Data Storage

When an SMS is analyzed:
1. ✅ Extracted transaction data is stored
2. ✅ Risk analysis results are stored
3. ✅ 7-layer security analysis logs are stored
4. ⚠️ Raw SMS is stored (for audit trail)
5. ⚠️ Personal data (phone number, recipient) is stored
6. ✅ Data retention: Until user account deletion + 30 days

**Data Security:**
- All data encrypted in transit (HTTPS/TLS)
- Database encryption at rest
- User isolation enforced
- Bearer token authentication

---

## Integration Examples

### cURL

**Analyze SMS:**
```bash
curl -X POST http://localhost:3000/api/chatbot/sms/analyze \
  -H "Authorization: Bearer user_123:email@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "MTN: Sent GHS 100 to John. Ref: ABC123. Balance: GHS 500"
  }'
```

**Get Dashboard Stats:**
```bash
curl -X GET http://localhost:3000/api/chatbot/stats/dashboard \
  -H "Authorization: Bearer user_123:email@example.com:1234567890"
```

**Get Fraud Report:**
```bash
curl -X GET "http://localhost:3000/api/chatbot/stats/fraud-report?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer user_123:email@example.com:1234567890"
```

### JavaScript/Fetch

```javascript
const token = "user_123:email@example.com:1234567890";

// Analyze SMS
const response = await fetch('/api/chatbot/sms/analyze', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    smsMessage: "MTN: Sent GHS 100 to John..."
  })
});

const data = await response.json();
console.log(data.chatbotReply);
```

---

## Support

For issues or questions about this API, please refer to:
- **Documentation:** See 7_LAYER_IMPLEMENTATION_SUMMARY.md
- **Code:** src/routes/chatbot-sms-analyze.ts, src/utils/momo-sms-parser.ts
- **Framework:** See authentication and project-structure docs

---

**Last Updated:** 2024-01-15
**Status:** ✅ Production Ready
