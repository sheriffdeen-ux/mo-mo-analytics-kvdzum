# MoMo SMS Fraud Detection - Testing Guide

## Quick Test

### Endpoint
```
POST /api/chatbot/analyze-sms
Authorization: Bearer userId:email:timestamp
Content-Type: application/json
```

### Test Payload
```json
{
  "smsMessage": "0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23."
}
```

### Expected Response
```json
{
  "success": true,
  "reply": "Amount: GHS 10.00\nRecipient: AJARATU SEIDU\nTime: 2026-02-13 at 16:51:59\nRisk Score: 15/100\n✅ Transaction appears legitimate. Safe to proceed.",
  "riskLevel": "LOW",
  "riskScore": 15,
  "shouldAlert": false,
  "transactionAnalysis": {
    "transactionId": "uuid",
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
      "layer1": {
        "status": "PASS",
        "provider": "MTN MOBILE MONEY"
      },
      "layer3": {
        "nlpScore": 0,
        "scamKeywords": []
      },
      "layer5": {
        "riskScore": 15,
        "riskLevel": "LOW",
        "breakdown": {
          "amountScore": 0,
          "timeScore": 0,
          "velocityScore": 0,
          "behaviorScore": 0,
          "nlpScore": 0
        }
      }
    }
  },
  "processingTimeMs": 87
}
```

## Test Cases

### Test 1: Legitimate Received Transaction
**Category:** LOW RISK (Expected: 0-20)

**SMS:**
```
0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23.
```

**Expected Parsing:**
- transactionId: "0000012062913379"
- type: "received"
- amount: 10.00
- senderNumber: "233593122760"
- senderName: "AJARATU SEIDU"
- provider: "MTN MOBILE MONEY"
- balance: 14.23
- isValidTransaction: true

**Expected Risk Scoring:**
- amountScore: 0 (< 1000)
- timeScore: 0 (16:51 is daytime)
- nlpScore: 0 (no scam keywords)
- totalScore: 0 → Capped at 20 (known provider)
- riskLevel: LOW
- shouldAlert: false

**Chatbot Reply:**
```
Amount: GHS 10.00
Recipient: AJARATU SEIDU
Time: 2026-02-13 at 16:51:59
Risk Score: 15/100
✅ Transaction appears legitimate. Safe to proceed.
```

---

### Test 2: Sent Transaction - Late Night
**Category:** MEDIUM RISK (Expected: 30-49)

**SMS:**
```
0000011656836069 Confirmed. GHS20.50 sent to 0241037421 DORCAS JATO on MTN MOBILE MONEY on 2026-01-04 at 23:10:28. Your Telecel Cash balance is GHS0.53. You were charged GHS0.00. Your E-levy charge is GHS0.00.
```

**Expected Parsing:**
- transactionId: "0000011656836069"
- type: "sent"
- amount: 20.50
- receiverNumber: "0241037421"
- receiverName: "DORCAS JATO"
- provider: "MTN MOBILE MONEY"
- balance: 0.53
- fee: 0.00
- eLevy: 0.00
- time: "23:10:28" (late night!)
- isValidTransaction: true

**Expected Risk Scoring:**
- amountScore: 0 (< 1000)
- timeScore: 30 (23:10 is late night)
- behaviorScore: 10 (unusual time flag)
- nlpScore: 0 (no scam keywords)
- totalScore: 40 → Capped at 40 (known provider, minor flag)
- riskLevel: MEDIUM
- shouldAlert: false (MEDIUM doesn't trigger alert)

**Chatbot Reply:**
```
Amount: GHS 20.50
Recipient: DORCAS JATO
Time: 2026-01-04 at 23:10:28
Risk Score: 40/100
⚠️ Some unusual patterns detected. Proceed with caution.
```

---

### Test 3: Cash Out Transaction
**Category:** INVALID (Missing time)

**SMS:**
```
Cash Out made for GHS35.00 to KEK FOOD VENDOR AND COSMETICS. Current Balance: GHS18.12 Financial Transaction Id: 75238622739.Fee charged: GHS0.50.
```

**Expected Parsing:**
- transactionId: "75238622739"
- type: "cash_out"
- amount: 35.00
- merchantName: "KEK FOOD VENDOR AND COSMETICS"
- balance: 18.12
- fee: 0.50
- time: null ❌ (NOT in SMS)
- isValidTransaction: false

**Expected Response:**
```json
{
  "success": false,
  "error": "This doesn't appear to be a valid MoMo transaction SMS",
  "details": {
    "parseErrors": ["Transaction date not found", "Transaction time not found"],
    "rawSms": "Cash Out made for GHS35.00..."
  }
}
```

---

### Test 4: High Amount - Suspicious
**Category:** HIGH RISK (Expected: 50-74)

**SMS:**
```
0000001234567890 Confirmed. GHS8000.00 sent to 0201234567 UNKNOWN MERCHANT on 2026-01-15 at 03:30:45. Your Telecel Cash balance is GHS100.00.
```

**Expected Parsing:**
- amount: 8000.00 (very high!)
- time: "03:30:45" (3 AM - late night!)
- provider: "Telecel Cash"
- isValidTransaction: true

**Expected Risk Scoring:**
- amountScore: 30 (GHS 5-10K)
- timeScore: 30 (3:30 AM is very late)
- behaviorScore: 10 (unusual amount + unusual time)
- totalScore: 70 → Capped at 70 (known provider, BUT specific indicators exist)
- riskLevel: HIGH
- shouldAlert: true (HIGH triggers alert)

**Chatbot Reply:**
```
Amount: GHS 8000.00
Recipient: UNKNOWN MERCHANT
Time: 2026-01-15 at 03:30:45
Risk Score: 70/100
⚠️ Suspicious activity detected. Review carefully before proceeding.
```

---

### Test 5: Multiple Scam Keywords
**Category:** INVALID (Not a real MoMo transaction)

**SMS:**
```
URGENT: Click link to verify your Telecel Cash account. Prize claim pending! Update required now!
```

**Expected Parsing:**
- type: null (no "received/sent/cash_out" detected)
- amount: null (no GHS amount)
- provider: "Telecel Cash" (detected)
- isValidTransaction: false

**Expected Response:**
```json
{
  "success": false,
  "error": "This doesn't appear to be a valid MoMo transaction SMS",
  "details": {
    "parseErrors": [
      "Transaction type not detected",
      "Transaction ID not found",
      "Amount not found",
      "Transaction date not found",
      "Transaction time not found"
    ],
    "rawSms": "URGENT: Click link..."
  }
}
```

---

### Test 6: Vodafone Cash Received
**Category:** LOW RISK (Expected: 0-20)

**SMS:**
```
0000009876543210 Confirmed. You have received GHS50.00 from Vodafone Cash with transaction reference: 987654 on 2026-01-15 at 14:22:30. Your Vodafone Cash balance is GHS150.75.
```

**Expected Parsing:**
- provider: "Vodafone Cash"
- type: "received"
- amount: 50.00
- isValidTransaction: true

**Expected Risk Scoring:**
- All scores: 0 (normal transaction, known provider, daytime)
- riskLevel: LOW
- riskScore: < 20

---

### Test 7: AirtelTigo Money Sent
**Category:** LOW RISK (Expected: 0-20)

**SMS:**
```
0000005432109876 Confirmed. GHS75.25 sent to 0552345678 JOHN DOE on AirtelTigo Money on 2026-01-15 at 10:15:00. Your AirtelTigo Money balance is GHS425.00.
```

**Expected Parsing:**
- provider: "AirtelTigo Money"
- type: "sent"
- amount: 75.25
- isValidTransaction: true

**Expected Risk Scoring:**
- riskLevel: LOW
- riskScore: < 20

---

## Curl Test Commands

### Test 1 (Legitimate Received - LOW RISK)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer test_user:test@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "0000012062913379 Confirmed. You have received GHS10.00 from MTN MOBILE MONEY with transaction reference: Transfer From: 233593122760-AJARATU SEIDU on 2026-02-13 at 16:51:59. Your Telecel Cash balance is GHS14.23."
  }'
```

### Test 2 (Late Night Sent - MEDIUM RISK)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer test_user:test@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "0000011656836069 Confirmed. GHS20.50 sent to 0241037421 DORCAS JATO on MTN MOBILE MONEY on 2026-01-04 at 23:10:28. Your Telecel Cash balance is GHS0.53. You were charged GHS0.00. Your E-levy charge is GHS0.00."
  }'
```

### Test 3 (Invalid - No Time)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer test_user:test@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "Cash Out made for GHS35.00 to KEK FOOD VENDOR AND COSMETICS. Current Balance: GHS18.12 Financial Transaction Id: 75238622739.Fee charged: GHS0.50."
  }'
```

### Test 4 (High Amount + Late Night - HIGH RISK)
```bash
curl -X POST http://localhost:3000/api/chatbot/analyze-sms \
  -H "Authorization: Bearer test_user:test@example.com:1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "smsMessage": "0000001234567890 Confirmed. GHS8000.00 sent to 0201234567 UNKNOWN MERCHANT on 2026-01-15 at 03:30:45. Your Telecel Cash balance is GHS100.00."
  }'
```

---

## Success Criteria

✅ **All legitimate MoMo transactions score LOW (0-20)**
✅ **Invalid transactions return 400 error**
✅ **Late night transactions get MEDIUM risk**
✅ **High amounts + late night = HIGH risk**
✅ **Scam keywords alone don't affect legitimate transactions**
✅ **Chatbot reply uses correct emoji and format**
✅ **Processing time < 500ms**
✅ **All fields parsed correctly**
✅ **Database stores transaction with audit trail**

---

## Debugging Tips

### If Risk Score is Wrong
1. Check `layer5.breakdown` in response
2. Verify `isKnownProvider` is being set
3. Check NLP score calculation
4. Verify time is parsed correctly

### If Parsing Fails
1. Check `parseErrors` array
2. Verify SMS format matches expected
3. Look for required fields: type, amount, date, time, provider
4. Check isValidTransaction flag

### If Alert Not Created
1. Verify riskLevel >= MEDIUM
2. Check shouldAlert flag
3. Confirm database transaction created
4. Look for database errors in logs

---

**All tests pass = System is ready for production!** 🚀
