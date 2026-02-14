# SMS Chatbot System Implementation

## Overview

The SMS Chatbot System enables automatic SMS replies to fraud-validated transactions and comprehensive financial reporting. The system uses Gemini AI to generate natural, conversational SMS responses with transaction confirmations, daily summaries, and financial insights.

## Database Schema Changes

### 1. Transactions Table Extensions
Added to `src/db/schema.ts`:
- `aiReplyGenerated` (boolean, default false) - Whether an AI reply was generated
- `aiReplyContent` (text, nullable) - The generated SMS reply content
- `aiReplyTimestamp` (timestamp with timezone, nullable) - When the reply was generated

### 2. SMS Auto-Reply Settings Table
New table: `smsAutoReplySettings`
```
- id: UUID (primary key)
- userId: Text (required, references userExtended.userId)
- autoReplyEnabled: Boolean (default true) - Master control for auto-replies
- replyOnlyNoFraud: Boolean (default true) - Only reply if fraud detection passes (LOW risk)
- includeDailySummary: Boolean (default true) - Include "Sent X, Received Y" in reply
- includeWeeklySummary: Boolean (default false) - Include weekly totals
- includeMonthlySummary: Boolean (default false) - Include monthly totals
- customReplyTemplate: Text (nullable) - User's custom SMS template
- createdAt: Timestamp - Record creation time
- updatedAt: Timestamp - Last update time
```
Index: `idx_sms_auto_reply_settings_user_id` on userId for fast lookups

### 3. Financial Reports Table
New table: `financialReports`
```
- id: UUID (primary key)
- userId: Text (required, references userExtended.userId)
- reportType: Enum (daily, weekly, monthly)
- periodStart: Timestamp (required) - Period start in UTC
- periodEnd: Timestamp (required) - Period end in UTC
- totalSent: Decimal (10,2) - Total amount sent in period
- totalReceived: Decimal (10,2) - Total amount received in period
- transactionCount: Integer - Number of transactions
- averageTransactionAmount: Decimal (10,2) - Average per-transaction amount
- highestTransaction: Decimal (10,2) - Largest single transaction
- lowestTransaction: Decimal (10,2) - Smallest single transaction
- fraudDetectedCount: Integer - Number of high-risk transactions
- reportData: JSONB - Detailed breakdown including fraud rates and net flow
- createdAt: Timestamp - Report generation time
```
Indexes:
- `idx_financial_reports_user_id` on userId
- `idx_financial_reports_period` on (reportType, periodStart, periodEnd)

## API Endpoints

### 1. SMS Analysis & Auto-Reply

#### POST `/api/sms/analyze-and-reply`
Analyzes a transaction for fraud and generates an AI-powered SMS reply if conditions are met.

**Request Body:**
```json
{
  "transactionId": "uuid-string",
  "smsContent": "MTN Mobile Money: Sent GHS 50.00 to John Doe. Ref: ABC123. Your balance: GHS 245.50",
  "amount": 50.00,
  "timestamp": "2024-01-15T10:30:00Z",
  "reference": "ABC123",
  "transactionType": "sent"
}
```

**Response:**
```json
{
  "success": true,
  "fraudDetected": false,
  "riskScore": 15,
  "riskLevel": "LOW",
  "riskReasons": ["Moderate transaction amount"],
  "aiReply": "Confirmed: Sent GHS 50.00 to John (Ref: ABC123) at 10:30 AM. Today: Sent GHS 150, Received GHS 500.",
  "aiReplyGenerated": true
}
```

**Logic:**
1. Validates all required fields
2. Extracts userId from Bearer token
3. Calculates fraud score based on:
   - Transaction amount (>5000: +20 pts, >2000: +10 pts)
   - Time of day (midnight-5am: +15 pts)
   - Frequency (>5 transactions today: +20 pts)
4. Determines risk level:
   - 0-24: LOW (no fraud)
   - 25-49: MEDIUM
   - 50-74: HIGH
   - 75+: CRITICAL
5. If `autoReplyEnabled` AND (no fraud OR `replyOnlyNoFraud` is false):
   - Generates AI reply using Gemini with transaction details
   - Optionally includes daily/weekly/monthly summaries
   - Stores reply in transactions table
6. Returns fraud analysis and generated reply (if any)

### 2. Auto-Reply Settings Management

#### GET `/api/sms/auto-reply-settings`
Retrieves user's current auto-reply configuration.

**Response:**
```json
{
  "success": true,
  "settings": {
    "autoReplyEnabled": true,
    "replyOnlyNoFraud": true,
    "includeDailySummary": true,
    "includeWeeklySummary": false,
    "includeMonthlySummary": false,
    "customReplyTemplate": null
  }
}
```

**Behavior:**
- Returns existing settings if found
- Creates default settings on first access
- Default: All replies enabled, reply only if no fraud, daily summary included

#### PUT `/api/sms/auto-reply-settings`
Updates user's auto-reply settings.

**Request Body (all fields optional):**
```json
{
  "autoReplyEnabled": false,
  "replyOnlyNoFraud": true,
  "includeDailySummary": true,
  "includeWeeklySummary": true,
  "includeMonthlySummary": false,
  "customReplyTemplate": "Transaction confirmed: [AMOUNT] [TYPE]. Ref: [REF]. Balance: [BALANCE]"
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "autoReplyEnabled": false,
    "replyOnlyNoFraud": true,
    "includeDailySummary": true,
    "includeWeeklySummary": true,
    "includeMonthlySummary": false,
    "customReplyTemplate": "Transaction confirmed: [AMOUNT] [TYPE]. Ref: [REF]. Balance: [BALANCE]"
  }
}
```

**Behavior:**
- Creates settings if they don't exist
- Partially updates existing settings
- Only specified fields are updated
- Returns updated settings

### 3. Financial Reports

#### GET `/api/financial-reports/daily`
Generates daily financial report for a specific date.

**Query Parameters:**
- `date` (optional, ISO 8601): Date to report on. Defaults to today.

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

#### GET `/api/financial-reports/weekly`
Generates weekly financial report.

**Query Parameters:**
- `weekStart` (optional, ISO 8601): Start of week. Defaults to current week.

**Response:** Same structure as daily, with `period: "weekly"` and weeklong aggregation.

#### GET `/api/financial-reports/monthly`
Generates monthly financial report.

**Query Parameters:**
- `month` (optional, ISO 8601): Month to report on. Defaults to current month.

**Response:** Same structure as daily, with `period: "monthly"` and monthly aggregation.

#### POST `/api/financial-reports/generate`
Generates and stores a financial report for a custom period.

**Request Body:**
```json
{
  "reportType": "weekly",
  "periodStart": "2024-01-08T00:00:00Z",
  "periodEnd": "2024-01-14T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid-of-report",
    "reportType": "weekly",
    "periodStart": "2024-01-08T00:00:00Z",
    "periodEnd": "2024-01-14T23:59:59Z",
    "totalSent": "8750.00",
    "totalReceived": "12500.00",
    "transactionCount": 45,
    "averageAmount": "473.33",
    "highestTransaction": "5000.00",
    "lowestTransaction": "25.00",
    "fraudDetectedCount": 3
  }
}
```

**Behavior:**
- Validates period dates
- Calculates all financial metrics
- Stores report in database for historical access
- Includes detailed breakdown in reportData JSONB field

## Files Created

### Route Handlers
1. **`src/routes/sms-auto-reply.ts`** (168 lines)
   - GET /api/sms/auto-reply-settings
   - PUT /api/sms/auto-reply-settings
   - Auto-creates default settings if missing
   - Token-based user authentication

2. **`src/routes/sms-analyze-reply.ts`** (276 lines)
   - POST /api/sms/analyze-and-reply
   - Fraud scoring logic
   - Gemini AI integration for reply generation
   - Non-blocking email-style error handling

3. **`src/routes/financial-reports.ts`** (386 lines)
   - GET /api/financial-reports/daily
   - GET /api/financial-reports/weekly
   - GET /api/financial-reports/monthly
   - POST /api/financial-reports/generate
   - Period calculation helpers
   - Comprehensive financial metrics aggregation

### Utilities
4. **`src/utils/sms-processor.ts`** (131 lines)
   - SMS parsing and transaction extraction
   - Provider detection (MTN, Vodafone, AirtelTigo)
   - Amount, reference, and balance extraction
   - Transaction validation
   - Formatting helpers for SMS replies

### Schema Updates
5. **`src/db/schema.ts`** (449 lines)
   - Updated transactions table with AI reply fields
   - New smsAutoReplySettings table
   - New financialReports table with comprehensive metrics

### Configuration
6. **`src/index.ts`** (updated)
   - Added imports for all new routes
   - Registered all new route handlers

## AI Reply Generation

### Gemini Integration
- **Model:** `gemini-pro`
- **API Key:** Environment variable `GEMINI_API_KEY`
- **Lazy Initialization:** Client only created if API key exists

### Reply Format
System generates conversational SMS replies with:
- Transaction type and amount
- Reference number
- Timestamp
- Conditionally included:
  - Daily total sent/received
  - Weekly summary
  - Monthly summary
  - Custom template if provided

### Reply Examples
**No Summary:**
```
Confirmed: Sent GHS 50.00 to John (Ref: ABC123) at 10:30 AM.
```

**With Daily Summary:**
```
Confirmed: Sent GHS 50.00 to John (Ref: ABC123) at 10:30 AM. Today: Sent GHS 150, Received GHS 500.
```

**Custom Template:**
User can define custom template like:
```
Transaction confirmed: [AMOUNT] [TYPE]. Ref: [REF]. Time: [TIME]. Balance: [BALANCE]
```

## Fraud Detection System

### Scoring Algorithm
```
Base Score: 0

Amount Check:
  if amount > 5000: +20 points
  else if amount > 2000: +10 points

Time Check:
  if 0:00 - 5:00 AM: +15 points

Frequency Check:
  if >5 transactions today: +20 points

Risk Levels:
  75+ = CRITICAL (red flag)
  50-74 = HIGH (suspicious)
  25-49 = MEDIUM (moderate)
  0-24 = LOW (normal)
```

### Reply Conditions
Replies are generated only when:
1. `autoReplyEnabled = true` AND
2. Either:
   - `replyOnlyNoFraud = false` (always reply) OR
   - `riskLevel = "LOW"` (no fraud detected)

### SMS Storage Policy
- Raw SMS is stored for ALL transactions (fraud or not)
- Used for audit trail and analysis
- When fraud is detected, both raw SMS and risk analysis are preserved

## Financial Metrics Calculation

### Period Aggregation
- **Daily:** Midnight to 11:59 PM local time
- **Weekly:** Monday through Sunday (ISO week)
- **Monthly:** 1st through last day of month

### Metrics
- **Total Sent:** Sum of all "sent" type transactions
- **Total Received:** Sum of all "received" type transactions
- **Transaction Count:** Total number of transactions
- **Average Amount:** (Total Sent + Total Received) / Count
- **Highest/Lowest:** Maximum and minimum transaction amounts
- **Fraud Detected:** Count of transactions with riskLevel != "LOW"

### Report Data Structure
Stored in JSONB for detailed analysis:
```json
{
  "summary": {
    "totalSent": 1250.00,
    "totalReceived": 3500.00,
    "netFlow": 2250.00
  },
  "statistics": {
    "transactionCount": 8,
    "averageAmount": 593.75,
    "highestTransaction": 1200.00,
    "lowestTransaction": 50.00
  },
  "fraud": {
    "detectedCount": 1,
    "detectionRate": 12.5
  }
}
```

## Authentication & Security

### Token Format
- Bearer tokens extracted from Authorization header
- Format: `userId:email:timestamp`
- Token validation checks userId exists

### User Isolation
- All queries filtered by userId from token
- Users can only access their own:
  - Auto-reply settings
  - Transaction analysis results
  - Financial reports

### Error Handling
- 401 Unauthorized for missing/invalid tokens
- Graceful fallbacks when Gemini API unavailable
- Non-blocking email sending (fire-and-forget pattern)

## Configuration

### Environment Variables
```
GEMINI_API_KEY=your-api-key        # Required for AI replies
FRONTEND_URL=http://localhost:3000 # Frontend URL for links
NODE_ENV=development               # For dev/prod modes
```

### Defaults
- Auto-reply enabled by default
- Reply only if no fraud by default
- Daily summary included by default
- Weekly/monthly summaries disabled by default

## Testing Scenarios

### Test Scenario 1: Normal Transaction with Daily Summary
```bash
POST /api/sms/analyze-and-reply
{
  "transactionId": "tx-123",
  "smsContent": "MTN: Sent GHS 100 to John. Ref: TXN123. Balance: GHS 500",
  "amount": 100,
  "timestamp": "2024-01-15T10:30:00Z",
  "reference": "TXN123",
  "transactionType": "sent"
}

Expected Response:
- fraudDetected: false
- riskLevel: LOW
- aiReply: Generated message with daily summary
- aiReplyGenerated: true
```

### Test Scenario 2: High-Risk Transaction (No Reply)
```bash
POST /api/sms/analyze-and-reply
{
  "transactionId": "tx-456",
  "smsContent": "MTN: Sent GHS 8000 at 2:30 AM. Ref: TXN456.",
  "amount": 8000,
  "timestamp": "2024-01-15T02:30:00Z",
  "reference": "TXN456",
  "transactionType": "sent"
}

Expected Response:
- fraudDetected: true
- riskLevel: CRITICAL (35 points = 20 + 15)
- aiReply: undefined (replyOnlyNoFraud=true blocks generation)
- aiReplyGenerated: false
```

### Test Scenario 3: Financial Report Query
```bash
GET /api/financial-reports/daily?date=2024-01-15T00:00:00Z

Expected Response:
- period: "daily"
- Aggregated totals for the day
- Transaction count and metrics
- fraudDetectedCount if any high-risk transactions
```

## Integration with Existing Systems

### Transaction Processing
1. Transaction received and stored in database
2. POST /api/sms/analyze-and-reply called with SMS details
3. Fraud detection runs (7-layer existing system + simple scoring)
4. If no fraud AND autoReplyEnabled: AI generates reply
5. Reply stored in transaction record for audit

### Financial Analytics
- Uses existing transactions table
- Filters by userId and date ranges
- Aggregates amounts and counts
- Detects fraud from risk levels

### User Management
- Settings stored per-user (userId)
- Default settings auto-created on first access
- Updates preserve existing values not specified

## Future Enhancements

1. **Advanced Fraud Detection:**
   - Machine learning model integration
   - Behavior pattern analysis
   - Merchant risk scoring

2. **Multi-Language Support:**
   - Generate replies in user's preferred language
   - SMS templates in different languages

3. **Scheduled Reports:**
   - Automatic daily/weekly/monthly report generation
   - Email delivery of reports
   - Push notifications for anomalies

4. **SMS Gateway Integration:**
   - Auto-send generated replies via Arkesel/Twilio
   - Delivery status tracking
   - Message queuing and retry

5. **Predictive Analytics:**
   - Spending pattern prediction
   - Budget recommendations
   - Anomaly detection alerts

6. **Compliance & Audit:**
   - Detailed transaction logging
   - Regulatory reporting
   - Data retention policies
