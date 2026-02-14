# Telecel Cash SMS Fraud Detection & 7-Layer Security Framework

## Overview

A comprehensive real-time fraud detection and prevention system for Mobile Money (MoMo) SMS transactions from Ghana. The system uses a 7-layer security framework to analyze transactions and generate risk assessments with automated chatbot replies.

## Supported MoMo Providers

- **Telecel Cash** - Telecel mobile money service
- **MTN MOBILE MONEY** - MTN mobile money service
- **Vodafone Cash** - Vodafone mobile money service
- **AirtelTigo Money** - AirtelTigo mobile money service

## SMS Parsing Capabilities

### Transaction Types Supported

1. **RECEIVED** - Money received from sender
   - Extracts: sender name, sender number, amount, timestamp, balance
   - Example: "You have received GHS10.00 from 233593122760-AJARATU SEIDU..."

2. **SENT** - Money sent to recipient
   - Extracts: receiver name, receiver number, amount, timestamp, balance
   - Example: "GHS20.50 sent to 0241037421 DORCAS JATO..."

3. **CASH_OUT** - Cash withdrawal from agent
   - Extracts: merchant name, amount, timestamp, balance
   - Example: "Cash Out made for GHS35.00 to KEK FOOD VENDOR..."

### Extracted Fields

```typescript
{
  transactionId: "0000012062913379" | "75238622739",
  type: "received" | "sent" | "cash_out",
  amount: 10.00,
  senderName: "AJARATU SEIDU",
  senderNumber: "233593122760",
  receiverName: "DORCAS JATO",
  receiverNumber: "0241037421",
  merchantName: "KEK FOOD VENDOR AND COSMETICS",
  transactionDate: "2026-02-13",
  time: "16:51:59",
  balance: 14.23,
  fee: 0.50,
  eLevy: 0.00,
  provider: "Telecel Cash" | "MTN MOBILE MONEY",
  isValidTransaction: true
}
```

## 7-Layer Security Framework

### Architecture

```
SMS Input
    ↓
[Layer 1] SMS Parsing & Extraction
    ↓ Validates SMS format and extracts transaction details
[Layer 2] Input Validation & Sanitization
    ↓ Verifies data integrity and completeness
[Layer 3] Pattern Recognition & NLP
    ↓ Detects scam keywords and suspicious patterns
[Layer 4] Behavioral Analytics
    ↓ Analyzes transaction time and amount patterns
[Layer 5] Real-Time Risk Scoring (0-100)
    ↓ Calculates composite risk score
[Layer 6] Alert System
    ↓ Determines if alert should be sent
[Layer 7] Compliance & Audit Trail
    ↓ Logs for regulatory compliance
    ↓
Output: Risk Level + Chatbot Reply
```

### Layer Descriptions

#### Layer 1: SMS Parsing & Extraction
- Identifies MoMo provider from SMS content
- Extracts all transaction fields using multiple regex patterns
- Validates transaction type (received/sent/cash_out)
- Status: PASS if valid transaction, FAIL otherwise

**Processing Time:** <5ms

#### Layer 2: Input Validation & Sanitization
- Validates amount is positive and reasonable
- Checks date and time are properly formatted
- Verifies recipient information exists
- Returns list of validation errors

**Processing Time:** <5ms

#### Layer 3: Pattern Recognition & NLP
- Detects scam keywords: "urgent", "verify", "click", "link", "reward", etc.
- Sentiment analysis (positive/negative/neutral)
- Identifies suspicious patterns
- Only flags legitimate MoMo messages with known providers at low scores

**Scoring:**
- 0-20 points: No suspicious patterns
- 20-50 points: Few keywords detected
- 50+ points: Multiple scam indicators

**Processing Time:** <10ms

#### Layer 4: Behavioral Analytics
- **Unusual Time Detection:** Flags transactions between 22:00-05:00
- **Unusual Amount Detection:** Flags transactions > GHS 5,000
- **Velocity Analysis:** Would track transaction frequency (for future enhancement)
- Calculates behavioral anomaly score

**Processing Time:** <20ms

#### Layer 5: Real-Time Risk Scoring (0-100)
Composite score from multiple factors:

**Amount Scoring (0-40 points):**
- > GHS 10,000: 40 pts
- GHS 5,000-10,000: 30 pts
- GHS 1,000-5,000: 15 pts
- < GHS 1,000: 0 pts

**Time Scoring (0-30 points):**
- 22:00-05:00 (late night): 30 pts
- Other times: 0 pts

**Behavior Scoring (0-25 points):**
- Anomalies detected: 25 pts
- Unusual amount: 10 pts
- No anomalies: 0 pts

**NLP Scoring (0-50 points):**
- Multiple keywords: Up to 50 pts
- **However:** Legitimate MoMo messages with known providers receive penalty reduction

**Processing Time:** <10ms

**Total Processing Time:** <350ms

#### Layer 6: Alert System
- Determines alert necessity based on risk level
- Maps to alert level: LOW/MEDIUM/HIGH/CRITICAL
- Generates alert message

**Risk Level Mapping:**
| Risk Score | Level | Alert | Message |
|-----------|-------|-------|---------|
| 0-29 | LOW | No | "Transaction appears legitimate" |
| 30-49 | MEDIUM | Yes | "Be cautious with this transaction" |
| 50-74 | HIGH | Yes | "Please review this transaction" |
| 75-100 | CRITICAL | Yes | "DO NOT PROCEED with this transaction" |

**Processing Time:** <5ms

#### Layer 7: Compliance & Audit Trail
- Records all analysis results
- Creates audit trail for regulatory compliance
- Stores layer results with timestamp
- Compliance status: COMPLIANT or REVIEW_REQUIRED

**Processing Time:** <5ms

---

## Risk Scoring Logic

### Key Principle
**ALL transactions that are successfully parsed from known MoMo provider sender IDs (Telecel Cash, MTN MOBILE MONEY, etc.) default to LOW RISK** unless there are specific fraud indicators.

### Scoring Factors

1. **Provider Validation** (Automatic)
   - Legitimate Telecel/MTN message → Risk reduction
   - Unknown provider → Risk increase

2. **Amount Analysis**
   - Very high amounts (>GHS 5,000) → Score increase
   - Normal amounts (< GHS 1,000) → Score decrease

3. **Time Analysis**
   - Late night (22:00-05:00) → Score increase
   - Business hours → Score decrease

4. **Pattern Analysis**
   - Scam keywords → Score increase
   - Standard transaction format → Score decrease

5. **Behavior Analysis**
   - Unusual patterns → Score increase
   - Normal behavior → Score decrease

### Risk Level Determination

```
Risk Score (0-100) → Risk Level
0-29    → LOW         ✅ Safe
30-49   → MEDIUM      ⚠️ Monitor
50-74   → HIGH        ⚠️ Review
75-100  → CRITICAL    ❌ Block
```

---

## Chatbot Reply Format

All chatbot replies follow this exact template:

```
Amount: GHS {amount}
Recipient: {recipient}
Time: {timestamp}
Risk Score: {score}/100
{emoji} {reason}
```

### Examples

**LOW Risk (✅):**
```
Amount: GHS 10.00
Recipient: AJARATU SEIDU
Time: 2026-02-13 at 16:51:59
Risk Score: 15/100
✅ Transaction appears legitimate. Safe to proceed.
```

**MEDIUM Risk (⚠️):**
```
Amount: GHS 500.00
Recipient: Unknown
Time: 2026-02-13 at 23:30:00
Risk Score: 42/100
⚠️ Some unusual patterns detected. Proceed with caution.
```

**HIGH Risk (⚠️):**
```
Amount: GHS 8000.00
Recipient: KEK FOOD VENDOR AND COSMETICS
Time: 2026-02-13 at 02:15:00
Risk Score: 68/100
⚠️ Suspicious activity detected. Review carefully before proceeding.
```

**CRITICAL Risk (❌):**
```
Amount: GHS 15000.00
Recipient: Unknown
Time: 2026-02-13 at 03:00:00
Risk Score: 92/100
⚠️ Multiple high-risk indicators detected. DO NOT PROCEED with this transaction.
```

---

## API Endpoints

### Main Endpoint: POST /api/chatbot/analyze-sms

**Request:**
```json
{
  "smsMessage": "0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23."
}
```

**Response (Success):**
```json
{
  "success": true,
  "reply": "Amount: GHS 10.00\nRecipient: AJARATU SEIDU\nTime: 2026-02-13 at 16:51:59\nRisk Score: 15/100\n✅ Transaction appears legitimate. Safe to proceed.",
  "riskLevel": "LOW",
  "riskScore": 15,
  "shouldAlert": false,
  "transactionAnalysis": {
    "transactionId": "uuid-123",
    "parsed": {
      "provider": "MTN MOBILE MONEY",
      "type": "received",
      "amount": 10.00,
      "recipient": "AJARATU SEIDU",
      "transactionDate": "2026-02-13",
      "time": "16:51:59",
      "balance": 14.23
    },
    "riskAnalysis": {
      "layer1": { "status": "PASS", "provider": "MTN MOBILE MONEY" },
      "layer3": { "nlpScore": 5, "scamKeywords": [] },
      "layer5": {
        "riskScore": 15,
        "riskLevel": "LOW",
        "breakdown": {
          "amountScore": 0,
          "timeScore": 0,
          "velocityScore": 0,
          "behaviorScore": 0,
          "nlpScore": 5
        }
      }
    }
  },
  "processingTimeMs": 87
}
```

**Response (Invalid SMS):**
```json
{
  "success": false,
  "error": "This doesn't appear to be a valid MoMo transaction SMS",
  "details": {
    "parseErrors": [
      "Transaction type not detected",
      "Provider not detected"
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

## Database Schema

### Transactions Table

New fields for fraud detection:
- `provider` - MoMo provider (Telecel Cash, MTN MOBILE MONEY, etc.)
- `transactionType` - sent/received/cash_out/withdrawal/deposit
- `recipient` - Recipient name/number or merchant
- `balance` - Account balance after transaction
- `riskScore` - Computed 0-100 risk score
- `riskLevel` - LOW/MEDIUM/HIGH/CRITICAL
- `riskReasons` - JSON array of risk factors

### 7-Layer Framework Fields

- `layer1SmsRaw` - Raw SMS text
- `layer2ValidationStatus` - PASS/FAIL
- `layer3NlpScore` - NLP analysis score
- `layer3ScamKeywords` - Detected scam keywords
- `layer4VelocityScore` - Behavioral velocity score
- `layer4AnomalyDetected` - Boolean anomaly flag
- `layer5RiskBreakdown` - JSON with factor breakdown
- `layer6AlertLevel` - Alert level (LOW/MEDIUM/HIGH/CRITICAL)
- `layer7AuditTrail` - Complete audit trail JSON

### Alerts Table

- `userId` - User ID
- `transactionId` - Linked transaction
- `alertLevel` - Alert severity
- `title` - Alert title
- `message` - Alert message
- `riskScore` - Risk score value
- `riskReasons` - Array of risk factors
- `isRead` - Read status

---

## Implementation Details

### File Structure

```
src/
├── utils/
│   ├── telecel-sms-parser.ts         # SMS parsing engine
│   └── fraud-detection-7-layer.ts    # 7-layer framework
├── routes/
│   └── fraud-analysis.ts             # API endpoints
└── db/
    └── schema.ts                     # Database tables
```

### Key Features

✅ **Multi-Pattern SMS Parsing**
- Handles multiple SMS formats from different providers
- Regex-based extraction with fallback patterns
- Comprehensive error reporting

✅ **7-Layer Security Framework**
- Sequential layer execution
- Each layer has clear responsibility
- Results flow to next layer

✅ **Real-Time Risk Scoring**
- Sub-350ms processing time
- Composite score from multiple factors
- Provider validation reduces false positives

✅ **Automatic Alert Generation**
- High-risk transactions trigger alerts
- In-app notifications stored
- Audit trail for compliance

✅ **User Transparency**
- Clear, templated chatbot replies
- Detailed risk breakdown
- Transaction analysis details

✅ **Regulatory Compliance**
- Full audit trail of all decisions
- Timestamps for all operations
- Data retention policies
- User consent tracking

---

## Testing Examples

### Test Case 1: Legitimate Received Transaction (LOW)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer userId:email:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23."
  }'
```
**Expected:** Risk Score 0-25 (LOW), ✅ reply, no alert

### Test Case 2: High Amount Late Night (HIGH)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer userId:email:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "Confirmed. GHS8000.50 sent to 0241037421 UNKNOWN PERSON on 2026-01-04 at 23:50:28. Your Telecel Cash balance is GHS0.53. Fee: GHS0.00."
  }'
```
**Expected:** Risk Score 55-75 (HIGH), ⚠️ reply, alert created

### Test Case 3: Scam Keywords (MEDIUM-HIGH)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer userId:email:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "URGENT: Click link to verify account. Prize claim pending! Ref: 12345"
  }'
```
**Expected:** Risk Score 40-60 (MEDIUM-HIGH), ⚠️ reply

### Test Case 4: Invalid SMS
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer userId:email:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "Random text without MoMo data"
  }'
```
**Expected:** 400 error with parse errors

---

## SMS Auto-Reply Settings

**Configuration:** "Only send replies when fraud is detected"

When enabled, the system only auto-sends SMS replies for HIGH or CRITICAL risk transactions, allowing legitimate LOW risk transactions to pass through silently.

---

## Performance Characteristics

| Component | Target Time |
|-----------|------------|
| Layer 1 (Parse) | < 5ms |
| Layer 2 (Validate) | < 5ms |
| Layer 3 (NLP) | < 10ms |
| Layer 4 (Behavior) | < 20ms |
| Layer 5 (Risk Score) | < 10ms |
| Layer 6 (Alert) | < 5ms |
| Layer 7 (Audit) | < 5ms |
| **Total** | **<350ms** |
| Database Insert | < 100ms |
| **Complete Response** | **<500ms** |

---

## Security Features

✅ Bearer token authentication on all endpoints
✅ User isolation (userId filtering)
✅ Input validation and sanitization
✅ Rate limiting (100 requests/hour per user)
✅ Complete audit trail with timestamps
✅ Encrypted data at rest and in transit
✅ No plaintext SMS storage (for original message)
✅ GDPR-compliant data retention

---

## Future Enhancements

1. **Machine Learning Integration**
   - Train on historical fraud patterns
   - Dynamic risk model updates
   - User-specific baselines

2. **Velocity Tracking**
   - Track transaction frequency
   - Detect rapid-fire suspicious activity
   - User behavior learning

3. **Blacklist Management**
   - Community-driven blacklist
   - Merchant reputation scores
   - Number reputation database

4. **SMS Gateway Integration**
   - Auto-send fraud alerts
   - Automatic transaction verification
   - Reply routing

5. **Advanced Analytics**
   - Fraud trend analysis
   - Risk dashboard
   - Custom report generation

---

## Support

**Documentation Files:**
- `TELECEL_SMS_FRAUD_DETECTION.md` - This file
- `CHATBOT_SMS_API.md` - API reference for other endpoints

**Code Files:**
- `src/utils/telecel-sms-parser.ts` - SMS parsing engine
- `src/utils/fraud-detection-7-layer.ts` - Fraud detection framework
- `src/routes/fraud-analysis.ts` - Main API endpoint

---

**Status:** ✅ Production Ready

**Created:** 2024-01-15

**Version:** 1.0.0

**Components:** SMS Parser, 7-Layer Framework, Chatbot Endpoint
