# Multi-Transaction SMS Parser Documentation

## Overview

The Multi-Transaction Parser is an advanced SMS parsing system designed to handle complex, multi-transaction SMS messages from Ghana MoMo providers (MTN, Telecel, Vodafone, AirtelTigo).

## Features

### 1. **Multi-Transaction Detection**
- Automatically detects and splits SMS containing multiple transactions
- Handles transactions separated by various delimiters (periods, newlines, etc.)
- Returns an array of parsed transactions for analysis

### 2. **Flexible Pattern Recognition**
- **MTN patterns:**
  - "Your payment of GHS X.XX to [RECIPIENT]"
  - "Cash Out made for GHS X.XX to [RECIPIENT]"
  - "Payment for GHS X.XX to [RECIPIENT]"
  - "MTN AIRTIME", "MTN BUNDLE"

- **Telecel patterns:**
  - "GHS X.XX paid to [RECIPIENT]"
  - "Confirmed. GHS X.XX paid to"
  - "Your new balance: GHS X.XX"

- **Vodafone & AirtelTigo:** Similar to MTN patterns

### 3. **Amount Extraction**
Multiple format support:
- `GHS 3.00`
- `₵3.00`
- `GH₵3.00`
- Amounts with or without decimals

### 4. **Recipient Extraction**
- "to 735000 - EXPRESSPAY" → number: "735000", name: "EXPRESSPAY"
- "to KEK FOOD VENDOR AND COSMETICS" → name: "KEK FOOD VENDOR AND COSMETICS"
- "paid to [RECIPIENT]" → Extracts recipient

### 5. **Fee & Tax Extraction**
- "Fee was GHS 0.38"
- "Fee charged: GHS0.50"
- "Tax was GHS 0.38"
- "Tax was GHS -" → Returns 0
- "E-levy charge is GHS 0.00"

### 6. **Balance Extraction**
- "Your new balance: GHS 73.62"
- "Current Balance: GHS18.12"
- "new Telecel Cash balance is GHS4.23"

### 7. **Reference & Transaction ID**
- "Financial Transaction Id: 75149483211"
- "Transaction Id: 75142267823"
- "Reference: bf32bab3xacc7"
- Leading 13-digit IDs

### 8. **Timestamp Handling**
- "at 2026-02-13 16:52:00"
- "on 2026-02-13 at 16:52:00"
- Converts to ISO 8601 format

## Usage

### Single Transaction (Backward Compatible)

```typescript
import { parseTransaction } from "../utils/telecel-sms-parser.js";

const parsed = parseTransaction(smsMessage);
// Returns single ParsedTransaction object
```

### Multi-Transaction

```typescript
import { parseMultiTransaction } from "../utils/multi-transaction-parser.js";

const result = parseMultiTransaction(smsMessage);
console.log(result.transactions);      // Array of Transaction objects
console.log(result.totalTransactions); // Number of transactions found
console.log(result.providers);         // Set of providers detected
console.log(result.parseErrors);       // Any parsing errors
```

## API Endpoint

### Single Transaction
```bash
POST /api/chatbot/sms/analyze
Content-Type: application/json
Authorization: Bearer <token>

{
  "smsMessage": "..."
}
```

**Response:**
```json
{
  "success": true,
  "chatbotReply": "...",
  "analysis": {
    "riskScore": 15,
    "riskLevel": "LOW",
    "riskFactors": [],
    "shouldAlert": false
  },
  "transaction": { ... }
}
```

### Multi-Transaction
When the parser detects multiple transactions, it automatically returns:

```json
{
  "success": true,
  "isMultiTransaction": true,
  "transactions": [
    {
      "index": 1,
      "provider": "MTN",
      "type": "airtime",
      "amount": 3.00,
      "recipient": "MTN AIRTIME",
      "balance": 84.00,
      "fee": 0.00,
      "riskScore": 15,
      "riskLevel": "LOW",
      "riskFactors": []
    },
    {
      "index": 2,
      "provider": "MTN",
      "type": "withdrawal",
      "amount": 35.00,
      "recipient": "KEK FOOD VENDOR AND COSMETICS",
      "balance": 18.12,
      "fee": 0.50,
      "riskScore": 25,
      "riskLevel": "LOW",
      "riskFactors": []
    }
  ],
  "summary": "Analyzed 4 transactions. All appear legitimate.",
  "overallRiskLevel": "LOW",
  "totalTransactionCount": 4
}
```

## Example: Complex Multi-Transaction SMS

Input:
```
Your payment of GHS 3.00 to MTN AIRTIME has been completed at 2026-02-13 07:48:47. Your new balance: GHS 84.00. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 75149483211. External Transaction Id: 75149483211. Cash Out made for GHS35.00 to KEK FOOD VENDOR AND COSMETICS. Current Balance: GHS18.12 Financial Transaction Id: 75238622739. Fee charged: GHS0.50. Payment for GHS1.00 to MTN BUNDLE. Current Balance: GHS 88.00. Transaction Id: 75142267823. Fee charged: GHS0.00. 0000012056467046 Confirmed. GHS20.00 paid to 735000 - EXPRESSPAY on 2026-02-13 at 00:45:30. Your new Telecel Cash balance is GHS4.23. You were charged GHS0.00. Your E-levy charge is GHS0.00.
```

Parsed Output:
```
Transaction 1 (MTN Airtime):
  - Provider: MTN
  - Type: airtime
  - Amount: 3.00 GHS
  - Time: 2026-02-13 07:48:47
  - Balance: 84.00 GHS
  - Transaction ID: 75149483211

Transaction 2 (MTN Cash Out):
  - Provider: MTN
  - Type: withdrawal
  - Amount: 35.00 GHS
  - Recipient: KEK FOOD VENDOR AND COSMETICS
  - Balance: 18.12 GHS
  - Fee: 0.50 GHS
  - Transaction ID: 75238622739

Transaction 3 (MTN Bundle):
  - Provider: MTN
  - Type: bundle (airtime)
  - Amount: 1.00 GHS
  - Recipient: MTN BUNDLE
  - Balance: 88.00 GHS
  - Transaction ID: 75142267823

Transaction 4 (Telecel Payment):
  - Provider: Telecel
  - Type: sent
  - Amount: 20.00 GHS
  - Recipient: 735000 - EXPRESSPAY
  - Time: 2026-02-13 00:45:30
  - Balance: 4.23 GHS
  - E-Levy: 0.00 GHS
  - Transaction ID: 12056467046
```

## Fraud Detection

Each transaction in a multi-transaction SMS is analyzed separately:

1. **Individual Risk Assessment:** Each transaction is run through the 7-layer fraud detection framework
2. **Risk Score Calculation:** Individual risk scores (0-100) are computed per transaction
3. **Overall Risk Level:** Set to the highest risk level found across all transactions
   - CRITICAL if any transaction is CRITICAL
   - HIGH if any transaction is HIGH (and none CRITICAL)
   - MEDIUM if any transaction is MEDIUM (and none HIGH/CRITICAL)
   - LOW if all transactions are LOW

4. **Alerts:** Generated for each HIGH/CRITICAL transaction

## Database Storage

Each transaction is stored individually in the `transactions` table with:
- All 7-layer analysis data
- Individual risk scores and levels
- Reference back to the original SMS (rawSms)
- User ID for tracking

## Error Handling

- **Partial Parsing:** If some segments fail to parse, valid transactions are still returned
- **Unknown Providers:** Non-MoMo SMS returns error without processing
- **Empty Results:** If no valid transactions found, returns error

## Backward Compatibility

- Single transaction SMS work exactly as before
- Existing endpoints continue to work without changes
- Old ParsedTransaction interface still supported via parseTransaction()
- Automatic fallback to single-transaction logic for simple SMS

## Performance

- Efficient string splitting and pattern matching
- Minimal regex compilation (compiled once, reused)
- Parallel transaction processing possible for large multi-transaction SMS
- Database insertion batching for multiple transactions

## Testing

```typescript
import { parseMultiTransaction } from "../utils/multi-transaction-parser.js";

// Test complex SMS
const result = parseMultiTransaction(complexSMS);
console.assert(result.totalTransactions === 4, "Should parse 4 transactions");
console.assert(result.providers.size === 2, "Should detect MTN and Telecel");
console.assert(result.transactions[0].amount === 3.00, "First amount should be 3.00");
console.assert(result.transactions[1].fee === 0.50, "Second fee should be 0.50");
```

## Future Improvements

1. **Machine Learning:** Use transaction patterns to improve accuracy
2. **Provider-Specific Rules:** Custom parsing rules per provider
3. **Caching:** Cache parsed results for identical SMS
4. **Async Processing:** Process large SMS asynchronously
5. **Analytics:** Track parsing accuracy and patterns
