# 7-Layer Security Framework for MoMo Fraud Detection

## Overview

The 7-Layer Security Framework is a comprehensive, multi-stage fraud detection system that analyzes mobile money transactions through seven distinct security layers. Each layer performs specific checks and generates risk assessments that feed into the next layer, creating a robust fraud prevention system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External SMS Source                       │
│         (Webhook or Manual Chatbot Input)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 1: SMS Capture & Parsing                       │
│  - Extract provider, type, amount, recipient, balance       │
│  - Status: PASS/FAIL                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 2: Input Validation & Sanitization             │
│  - Validate amount, provider, timestamp                     │
│  - Rate limiting check                                       │
│  - Status: PASS/FAIL                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 3: Pattern Recognition & NLP                   │
│  - Detect scam keywords                                      │
│  - Sentiment analysis                                        │
│  - Calculate NLP score (0-100)                              │
│  - Status: PASS/WARNING                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 4: Behavioral Analytics                         │
│  - User transaction history analysis                         │
│  - Amount anomaly detection (3x average)                     │
│  - Velocity scoring (transaction frequency)                 │
│  - Time pattern matching                                     │
│  - Status: PASS/WARNING                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 5: Real-Time Risk Scoring Engine               │
│  - Amount-based scoring                                      │
│  - Time-based scoring                                        │
│  - Velocity scoring                                          │
│  - Blacklist checking                                        │
│  - Behavioral anomaly scoring                                │
│  - NLP score integration                                     │
│  - Final risk score: 0-100                                   │
│  - Risk level: LOW/MEDIUM/HIGH/CRITICAL                     │
│  - Status: PASS/FAIL                                         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 6: Alert System                                │
│  - Generate alerts based on risk level                       │
│  - Create in-app notifications                               │
│  - Determine notification urgency                            │
│  - Status: PASS                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│         Layer 7: Compliance & Audit Trail                    │
│  - Log all layer results                                     │
│  - Store audit trail                                         │
│  - Mark compliance status                                    │
│  - Data retention: 90 days                                   │
│  - Status: PASS                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Transaction Record & Alert                       │
│         (Stored in Database for Audit)                       │
└─────────────────────────────────────────────────────────────┘
```

## Layer Details

### Layer 1: SMS Capture & Parsing

**Purpose:** Extract transaction information from raw SMS text

**Input:** Raw SMS message string

**Processing:**
- Detect provider (MTN, Vodafone, AirtelTigo)
- Identify transaction type (sent, received, withdrawal, deposit)
- Extract amount
- Extract recipient/sender
- Extract balance
- Extract reference number
- Parse timestamp

**Output:**
```typescript
{
  status: "PASS" | "FAIL",
  provider: "MTN" | "Vodafone" | "AirtelTigo" | null,
  type: string | null,
  amount: number | null,
  recipient: string | null,
  balance: number | null,
  reference: string | null,
  timestamp: Date,
  rawData: string
}
```

**Success Criteria:** PASS if provider, type, and amount are extracted successfully

---

### Layer 2: Input Validation & Sanitization

**Purpose:** Validate all extracted data and ensure data integrity

**Input:** Layer 1 parsed data

**Validation Rules:**
- Amount must be > 0 and < 999,999,999.99
- Provider must be known (MTN, Vodafone, AirtelTigo)
- Transaction type must be valid (sent, received, withdrawal, deposit)
- Timestamp must be valid
- Rate limiting: max 100 SMS/hour per user
- Text sanitization: remove special characters

**Output:**
```typescript
{
  status: "PASS" | "FAIL",
  validationErrors: string[],
  sanitizedData: { amount, provider, type, timestamp, recipient, reference, balance }
}
```

**Success Criteria:** PASS if all validations pass without errors

---

### Layer 3: Pattern Recognition & NLP

**Purpose:** Detect scam patterns and analyze language/sentiment

**Input:** Raw SMS message

**Detection Methods:**
- Scam keyword detection: "urgent", "verify", "suspended", "click", "link", "prize", "winner", "claim", etc.
- URL detection (suspicious links)
- Phone number patterns (unusual phone requests)
- Sentiment analysis (negative sentiment = higher risk)
- Unusual phrasing detection

**Scoring:**
- Each scam keyword: +15 points
- Suspicious action keywords: +10 points
- URL present: +20 points
- Phone number pattern: +5 points
- Negative sentiment: +10 points

**Output:**
```typescript
{
  status: "PASS" | "WARNING",
  nlpScore: number, // 0-100
  scamKeywords: string[],
  sentiment: "positive" | "neutral" | "negative"
}
```

**Success Criteria:** PASS if no scam keywords detected, WARNING if keywords found

---

### Layer 4: Behavioral Analytics & User Profiling

**Purpose:** Analyze user transaction behavior and detect anomalies

**Input:** User ID, transaction amount, timestamp

**Analysis:**
- Retrieve last 30 user transactions
- Calculate average transaction amount
- Check if amount is 3x+ average (anomaly)
- Velocity check: count transactions in last hour/3 hours
- Time pattern check: compare to user's typical transaction times
- Update user behavior profile

**Velocity Scoring:**
- 3+ transactions in last hour: +20 points
- 5+ transactions in last 3 hours: +30 points

**Amount Anomaly:**
- Amount > 3x average: +25 points + anomaly flag

**Output:**
```typescript
{
  status: "PASS" | "WARNING",
  velocityScore: number,
  anomalyDetected: boolean,
  anomalyReason: string | null,
  userProfile: {
    avgAmount: number | null,
    isOutlier: boolean,
    lastTransactionTime: Date | null
  }
}
```

**Success Criteria:** PASS if no anomalies detected, WARNING if anomaly found

---

### Layer 5: Real-Time Risk Scoring Engine

**Purpose:** Calculate comprehensive risk score from all factors

**Input:** Layer 1-4 results

**Scoring Breakdown:**

1. **Amount Scoring:**
   - <100: 0 points
   - 100-500: 20 points
   - 500-2000: 40 points
   - >2000: 60 points

2. **Time Pattern Scoring:**
   - Midnight-5am: +40 points (unusual time)
   - 10pm-12am: +20 points (late night)

3. **Velocity Scoring:** (from Layer 4)
   - Applied directly from Layer 4 (0-30 points)

4. **Round Amount Scoring:**
   - Amount is round (100, 500, 1000): +15 points

5. **Behavioral Anomaly Scoring:** (from Layer 4)
   - Anomaly detected: +25 points

6. **NLP Score:** (from Layer 3)
   - Applied directly (0-100 points)

7. **Blacklist Scoring:**
   - Global blacklist match: +60 points
   - User blacklist match: +50 points

**Total Risk Score:** Sum of all components (capped at 100)

**Risk Levels:**
- 0-39: LOW (green)
- 40-59: MEDIUM (yellow)
- 60-79: HIGH (orange)
- 80-100: CRITICAL (red)

**Output:**
```typescript
{
  status: "PASS" | "FAIL",
  riskScore: number, // 0-100
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  breakdown: {
    amountScore: number,
    timeScore: number,
    velocityScore: number,
    blacklistScore: number,
    roundAmountScore: number,
    behaviorScore: number,
    nlpScore: number
  }
}
```

**Success Criteria:** PASS if riskScore < 60, FAIL if >= 60

---

### Layer 6: Alert System

**Purpose:** Generate alerts based on risk level

**Input:** Risk level from Layer 5

**Alert Levels:**
- CRITICAL: Immediate notification required
- HIGH: Send notification
- MEDIUM: In-app alert only
- LOW: Log only, no alert

**Output:**
```typescript
{
  status: "PASS",
  alertLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  shouldAlert: boolean // true if HIGH/CRITICAL/MEDIUM
}
```

**Success Criteria:** Always PASS (always generates alert level)

---

### Layer 7: Compliance & Audit Trail

**Purpose:** Log all results for compliance and audit purposes

**Input:** All layer results, user ID, transaction ID

**Logging:**
- Record all 7 layer results
- Store processing times
- Store audit trail with timestamp
- Mark compliance status
- Data retention: 90 days

**Audit Trail Structure:**
```typescript
{
  timestamp: Date,
  layers: string[], // List of all 7 layers
  riskScore: number,
  alertGenerated: boolean,
  complianceStatus: "COMPLIANT" | "REVIEW_REQUIRED"
}
```

**Output:**
```typescript
{
  status: "PASS",
  auditTrail: { timestamp, layers, riskScore, alertGenerated, complianceStatus }
}
```

**Success Criteria:** Always PASS (always logs results)

---

## Database Schema

### New Tables Created

1. **alerts** - Transaction alerts
2. **smsLogs** - SMS message logs
3. **securityLayersLog** - 7-layer processing logs
4. **riskPatterns** - Configurable risk patterns
5. **userBehaviorProfile** - User transaction profiles
6. **recipientBlacklist** - Global and user-specific blacklists
7. **inAppAlerts** - In-app notification alerts

### Extended Tables

- **transactions** - Added 10+ fields for layer data storage

---

## API Endpoints

### 1. Webhook Reception
**POST /api/sms/webhook**
- Receives forwarded SMS from external sources
- Runs through all 7 layers
- Creates transaction and alerts
- Returns full analysis

### 2. Security Layer Analysis
**GET /api/security-layers/transaction/:transactionId**
- Retrieves detailed 7-layer analysis for a transaction
- Shows processing time per layer
- Returns overall status

### 3. In-App Alerts Management
- **GET /api/alerts/in-app** - List user's alerts (with pagination)
- **PUT /api/alerts/in-app/:alertId/read** - Mark alert as read
- **PUT /api/alerts/in-app/:alertId/dismiss** - Dismiss alert
- **POST /api/alerts/in-app/:alertId/action** - Record user action

### 4. Risk Pattern Management
- **GET /api/risk-patterns** - List active risk patterns
- **POST /api/risk-patterns** - Add new pattern (admin)

### 5. User Security Profile
- **GET /api/user-behavior-profile** - Get user's behavior profile
- **GET /api/recipient-blacklist** - List user's blacklisted recipients
- **POST /api/recipient-blacklist** - Add recipient to blacklist
- **DELETE /api/recipient-blacklist/:id** - Remove from blacklist

### 6. Security Dashboard
**GET /api/dashboard/security-overview**
- Returns security metrics
- Layer performance stats
- Recent alerts
- Risk distribution

### 7. Chatbot SMS Analysis
**POST /api/chatbot/analyze-sms**
- Manual SMS analysis endpoint
- Runs through all 7 layers
- Generates AI-powered reply
- Creates transaction record

---

## Performance Targets

- Layer 1 (SMS Capture): <10ms
- Layer 2 (Validation): <10ms
- Layer 3 (NLP): <50ms
- Layer 4 (Behavior): <100ms
- Layer 5 (Risk Scoring): <50ms
- Layer 6 (Alert): <5ms
- Layer 7 (Audit): <10ms

**Total Target:** <350ms for complete analysis

---

## Security Features

✅ **Multi-layer Defense:** 7 distinct security checks
✅ **Behavioral Analysis:** Historical pattern matching
✅ **NLP Detection:** Scam keyword identification
✅ **Velocity Checking:** Transaction frequency analysis
✅ **Blacklist Support:** Global and user-specific
✅ **Audit Trail:** Complete compliance logging
✅ **Real-time Processing:** Sub-350ms analysis
✅ **Configurable Patterns:** Dynamic risk pattern management
✅ **User Profiles:** Adaptive anomaly thresholds
✅ **In-App Alerts:** Immediate user notification

---

## Configuration

### Environment Variables
```
GEMINI_API_KEY=your-api-key    # For AI reply generation
FRONTEND_URL=http://localhost:3000
```

### Risk Pattern Types
```
- SCAM_KEYWORD: Detection of fraudulent language
- TIME_PATTERN: Unusual transaction times
- AMOUNT_PATTERN: Suspicious amount patterns
- VELOCITY: High transaction frequency
- LOCATION: Geographic anomalies
```

### Alert Levels
```
- CRITICAL: Immediate action required
- HIGH: Review and confirm
- MEDIUM: Monitor and check
- LOW: Log only
```

---

## Usage Example

### 1. Webhook Integration
```bash
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "MTN: Sent GHS 50.00 to John. Ref: TXN123. Balance: GHS 245.50",
    "userId": "user_123"
  }'
```

### 2. Chatbot Analysis
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer user_123:email@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "MTN: Sent GHS 5000 at 2:30 AM to Unknown. Ref: SUSP123."
  }'
```

### 3. View Security Analysis
```bash
curl -X GET http://localhost:3000/api/security-layers/transaction/txn_123 \
  -H "Authorization: Bearer user_123:email@example.com:1234567890"
```

### 4. Check In-App Alerts
```bash
curl -X GET "http://localhost:3000/api/alerts/in-app?page=1&limit=20&unreadOnly=true" \
  -H "Authorization: Bearer user_123:email@example.com:1234567890"
```

---

## Testing

### Test Cases

1. **Normal Transaction:** Should result in LOW risk
2. **Large Amount:** Should increase risk score
3. **Unusual Time:** 2-3 AM transactions should increase risk
4. **High Frequency:** Multiple transactions should increase velocity score
5. **Scam Keywords:** Should trigger Layer 3 warning
6. **Blacklisted Recipient:** Should trigger Layer 5 alert
7. **Amount Anomaly:** 3x average should trigger Layer 4 warning

---

## Future Enhancements

1. **Machine Learning Models:** Train on historical fraud data
2. **Real-time SMS Gateway:** Auto-send alerts via SMS
3. **Email Integration:** Detailed fraud reports via email
4. **Export Functionality:** PDF/CSV report generation
5. **Analytics Dashboard:** Visual fraud trend analysis
6. **Device Fingerprinting:** Link alerts to user devices
7. **Geo-location Analysis:** Location-based risk assessment
8. **API Rate Limiting:** Protect endpoints from abuse

---

## Support & Monitoring

- **Logging:** All transactions logged with full audit trail
- **Monitoring:** Layer processing times tracked for performance
- **Alerts:** Critical transactions trigger immediate notifications
- **Reports:** Weekly fraud summary reports
- **Compliance:** 90-day audit log retention

---

**System Status:** ✅ PRODUCTION READY
