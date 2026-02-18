# SMS Transaction Import System Documentation

## Overview

The SMS Transaction Import System is a user-triggered, on-demand transaction import mechanism that replaces automatic background SMS monitoring. Users explicitly control when transactions are imported and analyzed for fraud.

## Architecture Changes

### ✅ **Removed Components**
- ❌ Automatic SMS receivers
- ❌ Background forwarding logic
- ❌ Passive monitoring systems

### ✅ **Added Components**
- ✅ User-triggered import endpoints
- ✅ Structured transaction data validation
- ✅ On-demand fraud detection
- ✅ Audit trail and transparency reporting

## Database Schema Updates

### User Extended Table
```sql
-- New columns added to user_extended table
sms_import_enabled BOOLEAN DEFAULT false  -- Feature toggle
last_sms_import_at TIMESTAMP              -- Last import timestamp
total_sms_imports INTEGER DEFAULT 0       -- Import count
```

### Transactions Table
```sql
-- New columns added to transactions table
import_source VARCHAR DEFAULT 'chatbot'   -- 'manual' | 'sms_import' | 'chatbot'
imported_at TIMESTAMP                     -- When batch import occurred
```

## API Endpoints

### 1. POST /api/transactions/import-batch

**Purpose:** User-triggered batch import of structured transaction data

**Authentication:** Required (Bearer token)

**Rate Limit:** 100 transactions per request

**Request Body:**
```json
{
  "transactions": [
    {
      "senderId": "MTN MOBILE MONEY",
      "amount": 100.50,
      "type": "credit",
      "reference": "TXN123456",
      "timestamp": "2026-02-18T14:30:00Z",
      "recipient": "John Doe",
      "balance": 1000.00,
      "fee": 0.50,
      "tax": 0.10
    },
    {
      "senderId": "Vodafone Cash",
      "amount": 50.00,
      "type": "debit",
      "reference": "TXN123457",
      "timestamp": "2026-02-18T15:00:00Z",
      "recipient": "Merchant Name",
      "balance": 949.40,
      "fee": 0.25
    }
  ]
}
```

**Transaction Fields:**
- `senderId` (required): MoMo provider name (MTN, Vodafone, AirtelTigo, Telecel)
- `amount` (required): Transaction amount (positive number)
- `type` (required): "credit", "debit", "cash_out", "airtime", "bill_payment"
- `reference` (required): Transaction reference ID
- `timestamp` (required): ISO 8601 format
- `recipient` (optional): Recipient name/identifier
- `balance` (optional): Account balance after transaction
- `fee` (optional): Transaction fee
- `tax` (optional): Tax charged

**Valid Types:**
- `credit` → Received money (type: "received")
- `debit` → Sent money (type: "sent")
- `cash_out` → Cash withdrawal (type: "cash_out")
- `airtime` → Airtime purchase (type: "airtime")
- `bill_payment` → Bill payment (type: "bill_payment")

**Response (Success):**
```json
{
  "success": true,
  "imported": 2,
  "failed": 0,
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "riskLevel": "LOW",
      "riskScore": 15
    }
  ]
}
```

**Response (Partial Success):**
```json
{
  "success": true,
  "imported": 1,
  "failed": 1,
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "riskLevel": "LOW",
      "riskScore": 15
    }
  ],
  "errors": [
    "Transaction 1: Unknown provider - must be from MTN, Vodafone, AirtelTigo, or Telecel"
  ]
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "error": "Maximum 100 transactions per import"
}
```

### 2. GET /api/transactions/import-stats

**Purpose:** Retrieve user's import statistics and preferences

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalImports": 5,
    "lastImportAt": "2026-02-18T14:30:00Z",
    "transactionsImported": 23,
    "averageRiskScore": 18.5,
    "smsImportEnabled": true
  }
}
```

### 3. PUT /api/transactions/settings

**Purpose:** Update user's import preferences

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "smsImportEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "smsImportEnabled": true
  }
}
```

## Validation Rules

### Provider Validation
- Must contain: "MTN", "VODAFONE", "AIRTELTIGO", or "TELECEL"
- Case-insensitive matching
- Returns error if provider unknown

### Transaction Structure Validation
- `senderId`: string, required, non-empty
- `amount`: number, required, > 0
- `type`: string, required, must be valid type
- `reference`: string, required, non-empty
- `timestamp`: string, required, valid ISO 8601 format
- `recipient`: string, optional
- `balance`: number, optional, >= 0
- `fee`: number, optional, >= 0
- `tax`: number, optional, >= 0

### Rate Limiting
- Maximum 100 transactions per request
- Returns 429 status if exceeded

## Fraud Detection Flow

1. **Validate Structure** - Ensure all required fields present
2. **Validate Provider** - Confirm known MoMo provider
3. **Create Pseudo-Parsed Transaction** - Map import data to ParsedTransaction format
4. **Run 7-Layer Analysis** - Execute fraud detection on each transaction
5. **Store Results** - Save transaction with risk analysis
6. **Create Alerts** - Generate alerts for HIGH/CRITICAL risk

## Data Storage

### Transaction Storage
Each imported transaction is stored with:
- Structured transaction data (amount, recipient, etc.)
- Full 7-layer fraud analysis results
- Risk score and level
- Import metadata (source: "sms_import", timestamp)
- No raw SMS body (privacy-compliant)

### User Statistics
- `totalSmsImports`: Count of import operations
- `lastSmsImportAt`: Timestamp of most recent import
- `smsImportEnabled`: Feature toggle
- Tracked in `user_extended` table

## Security & Privacy

### ✅ **Security Measures**
- Bearer token authentication required on all endpoints
- Rate limiting (100 tx/request)
- Transaction structure validation
- Provider whitelist enforcement
- Audit logging for all imports

### ✅ **Privacy Compliance**
- No raw SMS bodies stored in database
- Only structured transaction data persisted
- User controls import feature via settings
- Transparent statistics available
- Full audit trail of import operations

## Audit Trail

All import operations logged with:
- User ID
- Timestamp of import
- Number of transactions processed
- Import success/failure details
- Risk analysis results

Example log entry:
```
Transaction batch import initiated
userId: user123
transactionCount: 5

Transaction imported successfully
userId: user123
txnIndex: 0
transactionId: 550e8400-e29b-41d4-a716-446655440000

Transaction batch import completed
userId: user123
imported: 5
failed: 0
```

## Behavioral Data & Analytics

### User Intent Signals
- Import frequency tracking
- Batch size analysis
- Provider distribution
- Time-of-day patterns

### Risk Analytics
- Average risk scores by provider
- Risk trend analysis
- Transaction type distribution
- Failed transaction patterns

### Engagement Metrics
- Feature adoption rate
- Active user count
- Monthly import volume
- User retention correlation

## Examples

### Example 1: Simple Debit Transaction

```json
{
  "senderId": "MTN MOBILE MONEY",
  "amount": 75.00,
  "type": "debit",
  "reference": "MTN20260218001",
  "timestamp": "2026-02-18T10:30:00Z",
  "recipient": "ABC Store",
  "balance": 925.00,
  "fee": 0.75
}
```

**Imported as:**
- Type: sent
- Provider: MTN MOBILE MONEY
- Risk Level: LOW
- Amount: GHS 75.00

### Example 2: Airtime Purchase

```json
{
  "senderId": "Vodafone Cash",
  "amount": 20.00,
  "type": "airtime",
  "reference": "VF20260218005",
  "timestamp": "2026-02-18T11:00:00Z",
  "balance": 180.00,
  "fee": 0.20
}
```

**Imported as:**
- Type: airtime
- Provider: Vodafone
- Risk Level: LOW
- Amount: GHS 20.00

### Example 3: Cash Out

```json
{
  "senderId": "AirtelTigo Money",
  "amount": 500.00,
  "type": "cash_out",
  "reference": "AT20260218012",
  "timestamp": "2026-02-18T14:30:00Z",
  "recipient": "John's Store",
  "balance": 1500.00,
  "fee": 5.00,
  "tax": 0.50
}
```

**Imported as:**
- Type: cash_out (withdrawal)
- Provider: AirtelTigo
- Risk Level: LOW
- Amount: GHS 500.00

## Error Handling

### Common Errors

**Invalid Structure:**
```json
{
  "success": false,
  "error": "transactions array is required"
}
```

**Unknown Provider:**
```json
{
  "success": true,
  "imported": 0,
  "failed": 1,
  "errors": [
    "Transaction 0: Unknown provider - must be from MTN, Vodafone, AirtelTigo, or Telecel"
  ]
}
```

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "error": "Maximum 100 transactions per import"
}
```

**Missing Fields:**
```json
{
  "success": true,
  "imported": 0,
  "failed": 1,
  "errors": [
    "Transaction 1: Invalid structure - missing required fields"
  ]
}
```

## Database Impact

### Indexes Added
```sql
idx_transactions_import_source  -- For filtering by source
```

### Query Examples

**Find all SMS-imported transactions:**
```sql
SELECT * FROM transactions
WHERE import_source = 'sms_import'
AND user_id = ?
ORDER BY imported_at DESC;
```

**Get import statistics:**
```sql
SELECT
  COUNT(*) as total_imports,
  MAX(imported_at) as last_import,
  COUNT(CASE WHEN import_source = 'sms_import' THEN 1 END) as sms_imported,
  AVG(risk_score) as avg_risk
FROM transactions
WHERE user_id = ? AND import_source = 'sms_import';
```

## Migration Notes

### From Automatic to On-Demand

1. **Disable automatic monitoring** - No background processes
2. **Users enable feature explicitly** - Via settings endpoint
3. **Track adoption metrics** - Monitor feature usage
4. **Preserve transaction history** - All existing data preserved
5. **Maintain audit trail** - Log source of each import

## Future Enhancements

1. **Scheduled Imports** - User-defined import schedules
2. **CSV Upload** - Bulk import via CSV files
3. **API Integration** - Direct provider API integration
4. **ML Calibration** - Improve fraud detection using import patterns
5. **Mobile App** - Native import interface
