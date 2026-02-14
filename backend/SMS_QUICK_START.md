# SMS Chatbot System - Quick Start Guide

## Setup

### 1. Environment Configuration
Add to your `.env` file:
```
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=http://localhost:3000
```

### 2. Database Migrations
The schema is automatically applied when the app starts. No manual migration needed.

## Key Endpoints

### Analyze Transaction & Generate Reply
```bash
curl -X POST http://localhost:3000/api/sms/analyze-and-reply \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "transactionId": "txn-123",
    "smsContent": "MTN: Sent GHS 100 to John. Ref: ABC123. Balance: GHS 500",
    "amount": 100,
    "timestamp": "2024-01-15T10:30:00Z",
    "reference": "ABC123",
    "transactionType": "sent"
  }'
```

**Response:**
```json
{
  "success": true,
  "fraudDetected": false,
  "riskScore": 10,
  "riskLevel": "LOW",
  "riskReasons": [],
  "aiReply": "Confirmed: Sent GHS 100.00 to John (Ref: ABC123) at 10:30 AM. Today: Sent GHS 150, Received GHS 500.",
  "aiReplyGenerated": true
}
```

### Get User's Auto-Reply Settings
```bash
curl -X GET http://localhost:3000/api/sms/auto-reply-settings \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp"
```

### Update Auto-Reply Settings
```bash
curl -X PUT http://localhost:3000/api/sms/auto-reply-settings \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "autoReplyEnabled": true,
    "includeDailySummary": true,
    "includeWeeklySummary": false,
    "customReplyTemplate": null
  }'
```

### Get Daily Financial Report
```bash
curl -X GET 'http://localhost:3000/api/financial-reports/daily?date=2024-01-15T00:00:00Z' \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp"
```

**Response:**
```json
{
  "success": true,
  "report": {
    "period": "daily",
    "periodStart": "2024-01-15T00:00:00Z",
    "periodEnd": "2024-01-15T23:59:59Z",
    "totalSent": "1250.00",
    "totalReceived": "3500.00",
    "transactionCount": 8,
    "averageAmount": "593.75",
    "highestTransaction": "1200.00",
    "lowestTransaction": "50.00",
    "fraudDetectedCount": 1
  }
}
```

### Get Weekly Financial Report
```bash
curl -X GET 'http://localhost:3000/api/financial-reports/weekly?weekStart=2024-01-08T00:00:00Z' \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp"
```

### Get Monthly Financial Report
```bash
curl -X GET 'http://localhost:3000/api/financial-reports/monthly?month=2024-01-01T00:00:00Z' \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp"
```

### Generate Custom Period Report
```bash
curl -X POST http://localhost:3000/api/financial-reports/generate \
  -H "Authorization: Bearer YOUR_USER_ID:your@email.com:timestamp" \
  -H "Content-Type: application/json" \
  -d '{
    "reportType": "weekly",
    "periodStart": "2024-01-08T00:00:00Z",
    "periodEnd": "2024-01-14T23:59:59Z"
  }'
```

## Common Use Cases

### Case 1: User Receives a Transaction SMS
1. Parse SMS to extract amount, reference, timestamp, type
2. Call POST /api/sms/analyze-and-reply with transaction details
3. If fraud detected, log it in transactions table
4. If no fraud and autoReplyEnabled, AI generates SMS reply
5. Reply is stored in transaction record for audit

### Case 2: User Wants to View Daily Spending
1. Call GET /api/financial-reports/daily
2. Returns total sent, total received, transaction count
3. Includes fraud detection statistics
4. Format for display in mobile app

### Case 3: User Configures Auto-Reply Settings
1. Call GET /api/sms/auto-reply-settings to see current settings
2. User adjusts preferences via mobile app UI
3. Call PUT /api/sms/auto-reply-settings with new values
4. Settings are updated and used for next transactions

### Case 4: Weekly Financial Report
1. User opens "Weekly Report" in app
2. Call GET /api/financial-reports/weekly (uses current week)
3. Display totals, averages, fraud count
4. Show trend compared to previous week

## Database Queries

### Get All Auto-Reply Settings for a User
```sql
SELECT * FROM sms_auto_reply_settings
WHERE user_id = 'user_123';
```

### Get Recent Transactions with AI Replies
```sql
SELECT id, amount, risk_level, ai_reply_content, ai_reply_timestamp
FROM transactions
WHERE user_id = 'user_123'
  AND ai_reply_generated = true
ORDER BY created_at DESC
LIMIT 10;
```

### Get Financial Report for a User
```sql
SELECT * FROM financial_reports
WHERE user_id = 'user_123'
  AND report_type = 'daily'
  AND period_start >= DATE_TRUNC('day', NOW())
ORDER BY created_at DESC;
```

### Find High-Risk Transactions
```sql
SELECT id, amount, risk_level, risk_reasons
FROM transactions
WHERE user_id = 'user_123'
  AND risk_level IN ('HIGH', 'CRITICAL')
ORDER BY created_at DESC;
```

## Fraud Risk Levels

| Level | Score Range | Meaning | Auto-Reply |
|-------|-------------|---------|-----------|
| LOW | 0-24 | Normal transaction | ✅ Generates reply |
| MEDIUM | 25-49 | Slightly suspicious | ❌ Blocked if replyOnlyNoFraud=true |
| HIGH | 50-74 | Suspicious | ❌ Blocked if replyOnlyNoFraud=true |
| CRITICAL | 75+ | Very suspicious | ❌ Blocked if replyOnlyNoFraud=true |

## Default Settings
- Auto-reply: **Enabled**
- Reply only if no fraud: **Enabled**
- Include daily summary: **Enabled**
- Include weekly summary: **Disabled**
- Include monthly summary: **Disabled**
- Custom template: **None**

## Performance Tips

1. **Indexes:** All user_id queries are indexed for fast lookups
2. **Period queries:** Use proper timestamp boundaries for efficient aggregation
3. **Batch reports:** Generate reports during off-peak hours
4. **Caching:** Consider caching daily reports (they don't change after midnight)

## Troubleshooting

### AI Reply Not Generated
**Possible Causes:**
- `autoReplyEnabled` is false → Check settings
- `replyOnlyNoFraud` is true AND fraud detected → Check risk level
- GEMINI_API_KEY not set → Add to environment
- Gemini service down → Check logs

**Solution:**
1. Verify settings: `GET /api/sms/auto-reply-settings`
2. Check logs for Gemini errors
3. Verify GEMINI_API_KEY in environment
4. Set `autoReplyEnabled: true` in settings

### Financial Report Shows Zero Transactions
**Possible Causes:**
- No transactions in specified period → Check transaction table
- Filtering by wrong date range → Verify period parameters
- User has no transactions yet → Create test transactions

**Solution:**
1. Query transactions table directly for the period
2. Verify date format is ISO 8601
3. Check userId is correct from token

### Fraud Score Too High/Low
**Factors:**
- Amount > 5000 → +20 points
- Amount > 2000 → +10 points
- Time 0:00-5:00 AM → +15 points
- >5 transactions today → +20 points

**Example:**
- GHS 100 at 10 AM, 1st transaction today → Score: 0 (LOW)
- GHS 6000 at 2 AM, 6 transactions today → Score: 50 (HIGH)
- GHS 3000 at 3 AM, 5 transactions today → Score: 40 (MEDIUM)

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

### HTTP Status Codes
- **200 OK:** Successful request
- **400 Bad Request:** Missing/invalid parameters
- **401 Unauthorized:** Missing/invalid token
- **500 Internal Server Error:** Server error

## Next Steps

1. **Integrate Endpoints:**
   - Add calls in transaction processing pipeline
   - Add settings UI in mobile app
   - Add reports dashboard

2. **SMS Gateway Integration:**
   - Auto-send generated replies via Arkesel/Twilio
   - Track delivery status
   - Handle SMS delivery errors

3. **Notifications:**
   - Push notification for fraud detected
   - Email summary reports
   - In-app alerts

4. **Advanced Analytics:**
   - Spending trend analysis
   - Budget recommendations
   - Merchant risk profiles

## Support & Documentation

- Full Implementation: `SMS_CHATBOT_IMPLEMENTATION.md`
- Implementation Checklist: `SMS_IMPLEMENTATION_CHECKLIST.md`
- Code Comments: Inline documentation in route files
- Database Schema: `src/db/schema.ts`
