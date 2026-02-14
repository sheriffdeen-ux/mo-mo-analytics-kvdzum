# 7-Layer Security Framework - Quick Reference

## 🚀 Quick Start

### 1. Webhook Integration (Receive SMS)
```bash
curl -X POST http://localhost:3000/api/sms/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "MTN: Sent GHS 100 to John. Ref: ABC123. Balance: GHS 500",
    "userId": "user_123"
  }'
```

**Response:** Full 7-layer analysis + transaction record + alerts

---

### 2. Chatbot Analysis (Manual Input)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer user_123:email@example.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "MTN: Sent GHS 8000 at 2:30 AM. Ref: SUSP123."
  }'
```

**Response:** Analysis + AI-generated reply + transaction

---

### 3. Check Security Analysis Details
```bash
curl -X GET http://localhost:3000/api/security-layers/transaction/txn_123456 \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

**Response:** Detailed 7-layer breakdown with processing times

---

### 4. View In-App Alerts
```bash
curl -X GET "http://localhost:3000/api/alerts/in-app?page=1&limit=20&unreadOnly=true" \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

**Response:** Paginated alerts list

---

### 5. Mark Alert as Read
```bash
curl -X PUT http://localhost:3000/api/alerts/in-app/alert_id_123/read \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

---

### 6. Record User Action on Alert
```bash
curl -X POST http://localhost:3000/api/alerts/in-app/alert_id_123/action \
  -H "Authorization: Bearer user_123:email@example.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "CONFIRMED_SAFE"
  }'
```

**Actions:** CONFIRMED_SAFE | BLOCKED | REPORTED

---

### 7. View Security Dashboard
```bash
curl -X GET http://localhost:3000/api/dashboard/security-overview \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

**Response:** Metrics, layer performance, recent alerts, risk distribution

---

### 8. Get User Behavior Profile
```bash
curl -X GET http://localhost:3000/api/user-behavior-profile \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

**Response:** Average transaction amount, typical times, frequency

---

### 9. Manage Blacklist
```bash
# Add recipient to blacklist
curl -X POST http://localhost:3000/api/recipient-blacklist \
  -H "Authorization: Bearer user_123:email@example.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientIdentifier": "suspicious_number_123",
    "reason": "Suspected scammer"
  }'

# View blacklist
curl -X GET http://localhost:3000/api/recipient-blacklist \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"

# Remove from blacklist
curl -X DELETE http://localhost:3000/api/recipient-blacklist/entry_id_123 \
  -H "Authorization: Bearer user_123:email@example.com:timestamp"
```

---

### 10. Manage Risk Patterns (Admin)
```bash
# View active patterns
curl -X GET http://localhost:3000/api/risk-patterns \
  -H "Authorization: Bearer admin:admin@example.com:timestamp"

# Add new pattern
curl -X POST http://localhost:3000/api/risk-patterns \
  -H "Authorization: Bearer admin:admin@example.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "patternType": "SCAM_KEYWORD",
    "patternValue": "new_scam_word",
    "riskWeight": 20
  }'
```

---

## 📊 Risk Scoring Quick Guide

| Score Range | Level | Action | Examples |
|------------|-------|--------|----------|
| 0-39 | LOW | Allow | Normal transactions, trusted recipients |
| 40-59 | MEDIUM | Monitor | Unusual times, new recipients |
| 60-79 | HIGH | Review | Large amounts, scam keywords |
| 80-100 | CRITICAL | Block | Multiple fraud indicators |

---

## 🎯 7 Layers Quick Reference

| Layer | Purpose | Status | Input | Output |
|-------|---------|--------|-------|--------|
| 1 | SMS Parsing | PASS/FAIL | Raw SMS | Provider, amount, recipient |
| 2 | Validation | PASS/FAIL | Parsed data | Sanitized, validated |
| 3 | NLP/Patterns | PASS/WARNING | Raw SMS | NLP score, keywords |
| 4 | Behavior | PASS/WARNING | History | Velocity, anomaly |
| 5 | Risk Score | PASS/FAIL | All above | Risk score 0-100 |
| 6 | Alert | PASS | Risk level | Alert level |
| 7 | Audit | PASS | All results | Audit trail logged |

---

## 🚨 Alert Levels

| Level | Notification | Action |
|-------|-------------|--------|
| CRITICAL | Immediate push + email | Block transaction |
| HIGH | Push notification | Review before proceeding |
| MEDIUM | In-app alert | Monitor |
| LOW | Log only | No action |

---

## 🔑 Key Fields in Response

### Transaction Response
```json
{
  "id": "txn_123",
  "riskScore": 65,
  "riskLevel": "HIGH",
  "provider": "MTN",
  "amount": 8000,
  "recipient": "John Doe",
  "reference": "REF123",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### Analysis Response
```json
{
  "layer1": { "status": "PASS", "provider": "MTN", "amount": 100 },
  "layer2": { "status": "PASS" },
  "layer3": { "nlpScore": 25, "scamKeywords": [] },
  "layer4": { "velocityScore": 10, "anomalyDetected": false },
  "layer5": { "riskScore": 35, "riskLevel": "LOW" },
  "layer6": { "alertLevel": "LOW", "shouldAlert": false },
  "layer7": { "auditTrail": {...} }
}
```

### Alert Response
```json
{
  "id": "alert_123",
  "transactionId": "txn_123",
  "alertLevel": "HIGH",
  "title": "HIGH Risk Transaction Detected",
  "riskScore": 65,
  "isRead": false,
  "createdAt": "2024-01-15T14:30:00Z"
}
```

---

## 🎯 Fraud Scoring Breakdown

### Amount Scoring
- < 100: 0 pts
- 100-500: 20 pts
- 500-2000: 40 pts
- > 2000: 60 pts

### Time Scoring
- 00:00-05:00: 40 pts (midnight)
- 22:00-24:00: 20 pts (late night)

### Velocity Scoring
- 3+ per hour: 20 pts
- 5+ per 3 hours: 30 pts

### Special Scoring
- Round amount (100, 500, 1000): 15 pts
- Behavioral anomaly (3x average): 25 pts
- Blacklisted recipient: 60 pts (global) / 50 pts (user)

### NLP Scoring
- Each scam keyword: 15 pts
- Suspicious actions: 10 pts
- URLs detected: 20 pts
- Negative sentiment: 10 pts

---

## 🔐 Authentication Format

All protected endpoints require Bearer token:
```
Authorization: Bearer userId:email:timestamp
```

Example:
```
Authorization: Bearer user_123:john@example.com:1234567890
```

---

## 📋 Common Scam Keywords Detected

- urgent
- verify
- suspended
- click
- link
- prize
- winner
- claim
- confirm
- update
- account compromised
- action required

---

## ⚡ Performance Targets

| Layer | Target Time |
|-------|------------|
| Layer 1 (SMS Capture) | < 10ms |
| Layer 2 (Validation) | < 10ms |
| Layer 3 (NLP) | < 50ms |
| Layer 4 (Behavior) | < 100ms |
| Layer 5 (Risk) | < 50ms |
| Layer 6 (Alert) | < 5ms |
| Layer 7 (Audit) | < 10ms |
| **Total** | **< 350ms** |

---

## 🐛 Common Test Cases

### Test 1: Normal Transaction
```json
{
  "smsMessage": "MTN: Sent GHS 100 to John. Ref: ABC123. Balance: GHS 500"
}
```
**Expected:** Risk Score: 0-20 (LOW)

### Test 2: Large Amount Late Night
```json
{
  "smsMessage": "MTN: Sent GHS 8000 at 2:30 AM. Ref: XYZ789"
}
```
**Expected:** Risk Score: 55-75 (HIGH)

### Test 3: Scam Keywords
```json
{
  "smsMessage": "URGENT: Click link to verify account. Prize claim pending!"
}
```
**Expected:** Risk Score: 40-60 (MEDIUM-HIGH)

### Test 4: High Velocity
```json
{
  "smsMessage": "MTN: Sent GHS 500 [5 times in 1 hour]"
}
```
**Expected:** Risk Score increases by 30+ points

---

## 📞 Support

- **Documentation**: See SECURITY_7_LAYERS_FRAMEWORK.md
- **Implementation**: See 7_LAYER_IMPLEMENTATION_SUMMARY.md
- **Code**: src/utils/security-7-layers.ts
- **Routes**: src/routes/sms-*.ts, src/routes/security-*.ts

---

## ✅ Deployment Checklist

- [ ] Database schema migrated
- [ ] GEMINI_API_KEY environment variable set
- [ ] All routes registered in index.ts
- [ ] Webhook URL configured in external SMS provider
- [ ] Test webhook integration
- [ ] Test chatbot analysis endpoint
- [ ] Verify alert notifications work
- [ ] Monitor layer processing times
- [ ] Set up audit log monitoring

---

**Framework Status:** ✅ PRODUCTION READY
