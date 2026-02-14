# SMS Chatbot System - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Mobile App / Frontend                       │
│                                                                   │
│  - Sends SMS transaction data                                   │
│  - Manages auto-reply settings                                  │
│  - Views financial reports                                      │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ HTTP/REST API
             │
┌────────────▼─────────────────────────────────────────────────────┐
│                    Fastify Server (Backend)                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Route Handlers                              │   │
│  │                                                          │   │
│  │  • POST /api/sms/analyze-and-reply                     │   │
│  │  • GET  /api/sms/auto-reply-settings                   │   │
│  │  • PUT  /api/sms/auto-reply-settings                   │   │
│  │  • GET  /api/financial-reports/daily                   │   │
│  │  • GET  /api/financial-reports/weekly                  │   │
│  │  • GET  /api/financial-reports/monthly                 │   │
│  │  • POST /api/financial-reports/generate                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                       │
│                           │                                       │
│  ┌────────────────────────▼──────────────────────────────────┐  │
│  │           Business Logic & Processing                      │  │
│  │                                                             │  │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐    │  │
│  │  │  Fraud Detection    │  │  AI Reply Generation     │    │  │
│  │  │                     │  │                          │    │  │
│  │  │  - Score Calc       │  │  - Gemini API Client     │    │  │
│  │  │  - Amount Check     │  │  - Template Processing   │    │  │
│  │  │  - Time Check       │  │  - Summary Formatting    │    │  │
│  │  │  - Frequency Check  │  │  - Custom Templates      │    │  │
│  │  └─────────────────────┘  └──────────────────────────┘    │  │
│  │                                                             │  │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐    │  │
│  │  │  SMS Processing     │  │  Financial Aggregation   │    │  │
│  │  │                     │  │                          │    │  │
│  │  │  - Parser           │  │  - Period Calculation    │    │  │
│  │  │  - Provider Detect  │  │  - Amount Summation      │    │  │
│  │  │  - Field Extract    │  │  - Metric Aggregation    │    │  │
│  │  │  - Validation       │  │  - Fraud Statistics      │    │  │
│  │  └─────────────────────┘  └──────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘   │
│                           │                                        │
│                           │                                        │
│  ┌────────────────────────▼──────────────────────────────────┐   │
│  │           Data Access Layer (Drizzle ORM)                 │   │
│  └────────────────────────────────────────────────────────────┘   │
│                           │                                        │
└───────────────────────────┼────────────────────────────────────────┘
                            │
                            │ SQL
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
   ┌────▼─────┐                         ┌──────▼──────┐
   │ PostgreSQL│                         │   Neon      │
   │(Local)   │                         │(Production) │
   │           │                         │             │
   │ PGlite   │                         │             │
   └───────────┘                         └─────────────┘
```

## Data Flow - Transaction Analysis

```
1. SMS Event
   └─> POST /api/sms/analyze-and-reply
       ├─ Extract: transactionId, amount, reference, timestamp, type
       ├─ Validate: Required fields check
       └─> User Authentication (Token extraction)
           └─> Fraud Detection
               ├─ Calculate Score
               │  ├─ Amount scoring
               │  ├─ Time scoring
               │  └─ Frequency scoring
               ├─ Determine Risk Level
               └─> Load User Settings
                   └─> Conditional AI Reply
                       ├─ Check: autoReplyEnabled?
                       ├─ Check: riskLevel == LOW OR replyOnlyNoFraud == false?
                       ├─> Call Gemini API
                       │   ├─ Generate natural SMS reply
                       │   └─ Include summaries if enabled
                       └─> Store Reply in Database
                           └─> Update transaction record
                               └─> Return Response
```

## Database Schema Relationships

```
┌────────────────────────┐
│   user_extended        │
├────────────────────────┤
│ userId (PK)            │◄──┐
│ email                  │   │
│ phoneNumber            │   │
│ emailVerified          │   │
│ subscriptionStatus     │   │
│ ...                    │   │
└────────────────────────┘   │
                             │
        ┌────────────────────┘
        │
        │        ┌──────────────────────┐
        │        │  transactions        │
        │        ├──────────────────────┤
        │        │ id (PK)              │
        │◄───────┤ userId (FK)          │
        │        │ amount               │
        │        │ risk_level           │
        │        │ aiReplyGenerated     │
        │        │ aiReplyContent       │
        │        │ aiReplyTimestamp     │
        │        │ ...                  │
        │        └──────────────────────┘
        │
        ├──────────────┬──────────────┐
        │              │              │
    ┌───▼──────────┐   │   ┌────────────▼─────────┐
    │ smsAutoReply │   │   │  financialReports    │
    │ Settings     │   │   ├──────────────────────┤
    ├──────────────┤   │   │ id (PK)              │
    │ id (PK)      │   │   │ userId (FK)          │
    │ userId (FK)  │◄──┘   │ reportType           │
    │ autoReply    │       │ periodStart          │
    │ Enabled      │       │ periodEnd            │
    │ replyOnly    │       │ totalSent            │
    │ NoFraud      │       │ totalReceived        │
    │ include...   │       │ transactionCount     │
    │ Summary      │       │ fraudDetectedCount   │
    │ custom       │       │ reportData (JSONB)   │
    │ ReplyTemplate│       │ ...                  │
    └──────────────┘       └──────────────────────┘
```

## Request/Response Flow

### SMS Analysis Request
```
Client
  │
  ├─ Headers
  │  └─ Authorization: Bearer userId:email:timestamp
  │
  └─ Body
     ├─ transactionId: string
     ├─ smsContent: string
     ├─ amount: number
     ├─ timestamp: ISO 8601
     ├─ reference: string
     └─ transactionType: sent|received|withdrawal|deposit

     │
     ▼
Server (Fraud Detection)
  │
  ├─ Validate input
  ├─ Extract userId from token
  ├─ Load user transactions for frequency
  ├─ Calculate fraud score
  ├─ Determine risk level
  └─ Load auto-reply settings

     │
     ├─ If autoReplyEnabled AND (noFraud OR allowFraudReply)
     │  │
     │  ├─ Calculate daily/weekly/monthly summaries
     │  ├─ Call Gemini API
     │  ├─ Generate AI reply
     │  └─ Store in transaction table
     │
     ▼
Response
  │
  ├─ success: boolean
  ├─ fraudDetected: boolean
  ├─ riskScore: number
  ├─ riskLevel: LOW|MEDIUM|HIGH|CRITICAL
  ├─ riskReasons: string[]
  ├─ aiReply?: string
  └─ aiReplyGenerated: boolean
```

## Component Responsibilities

### Route Handlers
- **sms-auto-reply.ts**
  - Manage user settings
  - CRUD operations on smsAutoReplySettings
  - Auto-create default settings
  - Token validation

- **sms-analyze-reply.ts**
  - Orchestrate fraud detection
  - Call Gemini for replies
  - Update transaction records
  - Return analysis results

- **financial-reports.ts**
  - Aggregate transaction data
  - Calculate metrics
  - Generate reports
  - Store reports in database

### Utilities
- **sms-processor.ts**
  - Parse SMS content
  - Extract transaction info
  - Validate transactions
  - Format replies

### Database
- Stores all transactions with audit trail
- Caches user settings
- Persists generated reports
- Maintains fraud history

### Gemini Integration
- Generates conversational SMS replies
- Supports custom templates
- Includes optional summaries
- Handles API errors gracefully

## Fraud Detection Algorithm

```
Input: Transaction Details
  ├─ Amount (GHS)
  ├─ Time of Day (0-23)
  └─ Frequency (today)

Process:
  ├─ Initialize Score = 0
  │
  ├─ AMOUNT CHECK
  │  ├─ if amount > 5000: score += 20
  │  ├─ else if amount > 2000: score += 10
  │  └─ reason: "Amount-based risk"
  │
  ├─ TIME CHECK
  │  ├─ if hour between 0-5: score += 15
  │  └─ reason: "Unusual transaction time"
  │
  ├─ FREQUENCY CHECK
  │  ├─ if count > 5 today: score += 20
  │  └─ reason: "High transaction frequency"
  │
  └─ RISK LEVEL MAPPING
     ├─ 0-24: LOW (green flag)
     ├─ 25-49: MEDIUM (yellow flag)
     ├─ 50-74: HIGH (orange flag)
     └─ 75+: CRITICAL (red flag)

Output:
  ├─ riskScore: 0-100
  ├─ riskLevel: LOW|MEDIUM|HIGH|CRITICAL
  └─ riskReasons: string[]
```

## Financial Report Aggregation

```
Period: Daily, Weekly, or Monthly

Query Transactions:
  ├─ Filter by userId
  ├─ Filter by period (start/end)
  ├─ Group by transactionType
  └─ Retrieve all matching records

Calculate Metrics:
  ├─ totalSent = SUM(amount WHERE type='sent')
  ├─ totalReceived = SUM(amount WHERE type='received')
  ├─ transactionCount = COUNT(*)
  ├─ averageAmount = (totalSent + totalReceived) / count
  ├─ highestTransaction = MAX(amount)
  ├─ lowestTransaction = MIN(amount)
  └─ fraudDetectedCount = COUNT(riskLevel != 'LOW')

Store Report:
  ├─ Insert into financialReports
  ├─ Store detailed breakdown in reportData JSONB
  ├─ Include fraud statistics
  └─ Timestamp creation time

Return to Client:
  ├─ All calculated metrics
  ├─ Period boundaries
  └─ Formatted as currency
```

## AI Reply Generation Flow

```
Input: Transaction Details + Settings

Prepare Prompt:
  ├─ Transaction type (sent/received/etc)
  ├─ Amount and reference
  ├─ Timestamp
  ├─ Optional summaries
  │  ├─ Daily: "Sent X, Received Y"
  │  ├─ Weekly: Weekly totals
  │  └─ Monthly: Monthly totals
  └─ Custom template (if provided)

Call Gemini API:
  ├─ Model: gemini-pro
  ├─ Send prompt
  ├─ Receive generated text
  └─ Validate response

Process Response:
  ├─ Extract SMS text
  ├─ Enforce character limit (320 max)
  ├─ Log generation success
  └─ Handle errors gracefully

Store & Return:
  ├─ Update transaction record
  ├─ Mark aiReplyGenerated = true
  ├─ Store aiReplyContent
  ├─ Set aiReplyTimestamp
  └─ Return in API response
```

## Authentication & Authorization

```
Token Format: userId:email:timestamp

Validation Flow:
  ├─ Extract from Authorization header (Bearer scheme)
  ├─ Split on ":"
  ├─ Extract userId from first part
  ├─ Verify token format
  └─ Return userId for query filtering

Query Filtering:
  ├─ All queries include: WHERE userId = extractedUserId
  ├─ Prevents user from accessing others' data
  ├─ Enforced at route handler level
  └─ Additional checks in business logic

Error Handling:
  ├─ Missing token: 401 Unauthorized
  ├─ Invalid format: 401 Unauthorized
  ├─ No userId match: 403 Forbidden (implicitly via WHERE clause)
  └─ Database errors: 500 Internal Server Error
```

## Performance Considerations

### Database Indexes
```
transactions:
  ├─ idx_transactions_user_id
  ├─ idx_transactions_created_at
  └─ idx_transactions_risk_level

smsAutoReplySettings:
  └─ idx_sms_auto_reply_settings_user_id

financialReports:
  ├─ idx_financial_reports_user_id
  └─ idx_financial_reports_period
```

### Optimization Strategies
1. **User Isolation:** All queries filtered by userId (single index lookup)
2. **Period Queries:** Compound indexes for period-based aggregations
3. **Lazy Loading:** Gemini client only initialized if API key exists
4. **Batch Operations:** Reports aggregate multiple transactions in single query
5. **Caching Opportunity:** Daily reports could be cached (immutable after midnight)

## Error Handling Strategy

```
Validation Errors:
  ├─ Missing fields: 400 Bad Request
  ├─ Invalid format: 400 Bad Request
  └─ Type mismatches: 400 Bad Request

Authentication Errors:
  ├─ Missing token: 401 Unauthorized
  ├─ Invalid token: 401 Unauthorized
  └─ Token mismatch: 403 Forbidden

Database Errors:
  ├─ Connection lost: 500 Internal Server Error
  ├─ Query fails: 500 Internal Server Error
  └─ Constraint violation: 500 Internal Server Error

External Service Errors:
  ├─ Gemini API down
  │  └─ Return success=true, aiReplyGenerated=false
  ├─ Timeout
  │  └─ Non-blocking, log warning
  └─ Invalid response
     └─ Graceful degradation

All errors logged with:
  ├─ Error type
  ├─ Context (userId, transaction ID)
  ├─ Stack trace
  └─ Timestamp
```

## Logging Strategy

```
Entry Points:
  ├─ Route entry: { userId, action, params }
  ├─ Authentication: { token_status, userId_extracted }
  └─ Data processing: { operation, affected_records }

Success Operations:
  ├─ Settings retrieved: { userId }
  ├─ Settings updated: { userId, fields_changed }
  ├─ Report generated: { userId, transactionCount }
  └─ Reply generated: { userId, replyLength }

Error Operations:
  ├─ Database error: { err, context }
  ├─ API error: { err, service, userId }
  ├─ Validation error: { field, value, expected }
  └─ Authentication error: { token, reason }

Log Levels:
  ├─ info: Normal operations, state changes
  ├─ warn: Recoverable errors, degraded behavior
  └─ error: Unrecoverable errors, service failures
```

## Scalability Considerations

1. **User Growth:** Indexes on userId ensure O(1) user lookups
2. **Transaction Volume:** Period-based queries scale with data volume
3. **Report Generation:** Batch reporting during off-peak hours
4. **API Rate Limiting:** Can be added at route handler level
5. **Caching Layer:** Redis for frequently accessed settings
6. **Database Partitioning:** Partition transactions by user_id/date

## Future Architecture Enhancements

1. **Message Queue:** Async reply generation via background jobs
2. **SMS Gateway:** Direct SMS sending via Arkesel/Twilio
3. **ML Model:** Replace rule-based fraud detection with trained model
4. **Streaming Analytics:** Real-time anomaly detection
5. **Multi-tenancy:** Support for organization-level reports
6. **Audit System:** Comprehensive compliance logging
