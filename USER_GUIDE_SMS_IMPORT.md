
# MoMo Analytics - SMS Import User Guide

## What Changed?

We've completely redesigned how MoMo Analytics accesses your SMS messages to prioritize **your privacy and control**.

### ❌ Old Approach (Removed)
- Automatic background SMS monitoring
- Continuous scanning of your inbox
- Auto-forwarding of messages
- Silent behavior without user knowledge

### ✅ New Approach (Privacy-Focused)
- **User-triggered only** - You press a button to import
- **On-demand scanning** - No background monitoring
- **Full transparency** - You see exactly what happens
- **Complete control** - Enable/disable anytime

---

## How It Works

### Step 1: Enable SMS Import (One-Time Setup)

1. Open the app and go to **Profile** → **SMS Transaction Import**
2. Read the explanation of how SMS import works
3. Tap **"Enable Transaction Import"**
4. Review the permission explanation modal
5. Tap **"Grant Permission"** to allow READ_SMS access

**What happens:**
- The app requests READ_SMS permission (NOT RECEIVE_SMS)
- No background receivers are registered
- No automatic scanning starts
- You remain in full control

### Step 2: Import Transactions (Whenever You Want)

1. Go to **Home** → **Import Transactions** (or Profile → SMS Transaction Import)
2. See your last sync time (e.g., "Last synced: 2 hours ago")
3. Tap **"Import New Transactions"**
4. The app scans your SMS inbox for MoMo messages
5. Only MTN, Vodafone, Telecel, AirtelTigo messages are processed
6. Structured transaction data is sent to the backend
7. You see a summary: "Successfully imported X transactions"

**What happens:**
- SMS inbox is scanned on your device
- Only MoMo provider messages are identified
- Transaction data is extracted (amount, date, type, reference)
- **Raw SMS content is NEVER sent to the server**
- Fraud detection runs on each transaction
- You see the results immediately

### Step 3: View Import Statistics

- **Total Imports**: How many times you've triggered imports
- **Transactions Imported**: Total number of transactions processed
- **Last Import**: When you last scanned your SMS
- **Average Risk Score**: Overall fraud risk of your transactions

---

## What We Access

### ✅ We Scan:
- MTN MoMo transaction SMS
- Vodafone Cash transaction SMS
- Telecel Cash transaction SMS
- AirtelTigo Money transaction SMS

### ❌ We DO NOT Access:
- Personal conversations
- WhatsApp, Telegram, or other messaging apps
- SMS from unknown senders
- Banking SMS (unless it's MoMo)
- OTP codes
- Promotional messages
- Any non-financial SMS

---

## What We Send to the Server

### ✅ Structured Transaction Data (Sent):
```json
{
  "senderId": "MTN MoMo",
  "amount": 50.00,
  "type": "credit",
  "reference": "TX123456",
  "timestamp": "2026-02-18T10:30:00Z",
  "balance": 150.00,
  "fee": 0.50
}
```

### ❌ Raw SMS Content (NEVER Sent):
```
"You have received GHS 50.00 from 0241234567. 
Your new balance is GHS 150.00. 
Reference: TX123456. 
Download the MoMo App..."
```

**We extract only the essential transaction details and discard the rest.**

---

## Privacy Controls

### Disable SMS Import
1. Go to **Profile** → **SMS Transaction Import**
2. Scroll down to **Privacy Controls**
3. Tap **"Disable SMS Import"**
4. Confirm your choice

**What happens:**
- SMS import is disabled on the backend
- You can no longer trigger imports
- Existing transaction data remains (for fraud analysis)
- You can re-enable anytime

### Delete Transaction Data
1. Go to **Profile** → **Settings**
2. Tap **"Delete All Transaction Data"**
3. Confirm deletion

**What happens:**
- All imported transactions are permanently deleted
- Fraud analysis history is cleared
- This action cannot be undone

### Revoke SMS Permission
1. Go to your device **Settings** → **Apps** → **MoMo Analytics**
2. Tap **Permissions** → **SMS**
3. Select **"Don't allow"**

**What happens:**
- The app can no longer access your SMS
- Import button will show "Permission needed"
- You can re-grant permission anytime

---

## Frequently Asked Questions

### Q: Why do you need SMS access?
**A:** To automatically extract transaction data from your Mobile Money SMS for fraud detection and financial analytics. This saves you from manually entering every transaction.

### Q: Do you read my personal messages?
**A:** No. We only scan SMS from known MoMo providers (MTN, Vodafone, Telecel, AirtelTigo). Personal conversations are completely ignored.

### Q: Is my SMS data stored on your servers?
**A:** No. We NEVER store raw SMS content. Only structured transaction data (amount, date, type) is sent to our servers for fraud analysis.

### Q: Can you access my SMS without me knowing?
**A:** No. We ONLY scan when you explicitly tap "Import Transactions". There is no background monitoring or automatic scanning.

### Q: What if I don't want to grant SMS permission?
**A:** You can still use the app! You can:
- Manually paste SMS messages into the AI Chatbot for analysis
- Manually enter transaction details
- Use fraud detection features without SMS access

### Q: Can I see what you've imported?
**A:** Yes. Go to **Profile** → **SMS Transaction Import** to see:
- Total imports
- Transactions imported
- Last import date
- Average risk score

### Q: How do I know you're not spying on me?
**A:** 
1. We use READ_SMS (not RECEIVE_SMS) - no background monitoring
2. No SMS receivers are registered in the app
3. You control when imports happen
4. Full transparency reports available
5. Open-source code available for audit
6. Compliant with Ghana Data Protection Act and GDPR

### Q: What happens if I uninstall the app?
**A:** All local data is deleted. Server-side transaction data is retained for 30 days (for fraud analysis), then permanently deleted.

---

## Technical Details (For Advanced Users)

### Permission Type
- **READ_SMS**: Allows reading SMS inbox on-demand
- **NOT RECEIVE_SMS**: We do NOT register background SMS receivers

### No Background Monitoring
- No `BroadcastReceiver` for `SMS_RECEIVED`
- No `Service` running in the background
- No `WorkManager` or `JobScheduler` for automatic scanning
- No `ContentObserver` watching SMS database

### Local Processing
1. User taps "Import Transactions"
2. App queries SMS inbox using `ContentResolver`
3. Filters messages by known MoMo sender IDs
4. Parses transaction data locally on device
5. Sends only structured JSON to backend
6. Backend runs fraud detection
7. Results displayed to user

### Data Flow
```
User Device                    Backend Server
-----------                    --------------
SMS Inbox
    ↓
Filter MoMo SMS
    ↓
Parse Locally
    ↓
Extract Data → → → → → → → → Receive JSON
    ↓                          ↓
Discard Raw SMS            Store Structured Data
                               ↓
                           Fraud Detection
                               ↓
                           Return Results
```

---

## Compliance & Security

### Compliance
- ✅ Ghana Data Protection Act, 2012 (Act 843)
- ✅ GDPR principles
- ✅ Google Play SMS and Call Log Permissions policy
- ✅ Mobile Money provider terms and conditions

### Security Measures
- ✅ End-to-end encryption (TLS/SSL)
- ✅ Encrypted storage at rest
- ✅ Access controls and audit logging
- ✅ Regular security audits
- ✅ No third-party data sharing
- ✅ Secure authentication (Better Auth)

---

## Support

If you have questions or concerns about SMS import:

- **Email**: privacy@momoanalytics.com
- **In-App**: Profile → Help & Support → Contact Us
- **Privacy Policy**: Profile → Privacy Policy

---

**Last Updated:** February 18, 2026
