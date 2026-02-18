
# Google Play Store SMS Permission Declaration

## App Name
MoMo Analytics - Fraud Detection for Ghana

## SMS Permission Usage Declaration

### 1. Core Functionality
SMS access is **core to the app's functionality** for transaction analysis and fraud detection.

### 2. Permission Type
We request **READ_SMS** permission only. We do NOT request RECEIVE_SMS.

### 3. User-Triggered Access (Critical)
**This is NOT automatic background monitoring.** SMS access is:
- ✅ **User-triggered only** - We scan ONLY when the user taps "Import Transactions"
- ✅ **On-demand** - No background SMS receivers or listeners
- ✅ **Transparent** - Users see exactly when imports happen
- ✅ **Controllable** - Users can enable/disable at any time

### 4. What We Access
We scan ONLY Mobile Money transaction SMS from known providers:
- MTN MoMo
- Vodafone Cash
- Telecel Cash
- AirtelTigo Money

**We do NOT access:**
- Personal conversations
- WhatsApp, Telegram, or other messaging apps
- SMS from unknown senders
- Any non-financial messages

### 5. Data Processing
**Local Processing First:**
- SMS messages are scanned and parsed on the user's device
- We extract structured transaction data (amount, date, type, reference)
- **Raw SMS content is NEVER sent to our servers**
- Only structured transaction data is transmitted

**What We Send to Server:**
```json
{
  "senderId": "MTN MoMo",
  "amount": 50.00,
  "type": "credit",
  "reference": "TX123456",
  "timestamp": "2026-02-18T10:30:00Z",
  "balance": 150.00
}
```

**What We DO NOT Send:**
- Raw SMS message body
- SMS sender phone numbers (only provider names)
- Personal conversations
- Unrelated messages

### 6. User Consent Flow
1. User navigates to "Import Transactions" screen
2. App displays full explanation of SMS access
3. User explicitly taps "Enable Transaction Import"
4. App shows detailed permission explanation modal
5. User grants READ_SMS permission
6. User must manually tap "Import" each time they want to scan

### 7. Transparency & Control
Users can:
- View import statistics (total imports, transactions imported, last import date)
- See transparency reports showing what was scanned
- Disable SMS import at any time
- Delete all imported transaction data
- Revoke permissions through device settings

### 8. Privacy Guarantees
- ✅ No background monitoring
- ✅ No automatic forwarding
- ✅ No continuous scanning
- ✅ Only MoMo SMS processed
- ✅ Raw SMS never stored on server
- ✅ User controls everything
- ✅ Full audit trail of all imports

### 9. Compliance
- Ghana Data Protection Act, 2012 (Act 843)
- GDPR principles
- Google Play SMS and Call Log Permissions policy
- Mobile Money provider terms and conditions

### 10. Alternative Access Method
Users who prefer not to grant SMS permission can:
- Manually paste SMS messages into the AI Chatbot for analysis
- Manually enter transaction details
- Use the app without SMS access (fraud detection still works)

### 11. Data Retention
- Transaction data retained for 12 months for fraud analysis
- Users can delete their data at any time
- Upon account deletion, all data is permanently removed within 30 days

### 12. Security Measures
- End-to-end encryption (TLS/SSL)
- Encrypted storage at rest
- Access controls and audit logging
- Regular security audits
- No third-party data sharing

---

## Declaration Statement for Play Console

**SMS Permission Justification:**

MoMo Analytics uses READ_SMS permission to enable user-triggered import of Mobile Money transaction SMS for fraud detection and financial analytics. This is a core feature of the app.

**Key Points:**
1. **User-Triggered Only**: SMS is scanned ONLY when the user explicitly taps "Import Transactions". There is NO automatic background monitoring.
2. **Specific Senders Only**: We scan ONLY Mobile Money SMS from MTN, Vodafone, Telecel, and AirtelTigo. Personal conversations are never accessed.
3. **Structured Data Only**: Raw SMS content is NEVER stored on our servers. Only extracted transaction data (amount, date, type) is transmitted.
4. **Full User Control**: Users can enable/disable SMS import, view transparency reports, and delete data at any time.
5. **Privacy by Design**: No background receivers, no automatic forwarding, no continuous monitoring.

This implementation complies with Google Play's SMS and Call Log Permissions policy by ensuring SMS access is:
- Core to the app's primary purpose (fraud detection)
- User-initiated and transparent
- Limited to specific, relevant messages
- Respectful of user privacy

---

## Screenshots for Play Console Submission

Include screenshots showing:
1. SMS permission explanation screen
2. "Import Transactions" button with "Last synced" indicator
3. Permission request dialog
4. Import statistics and transparency report
5. Privacy controls (disable SMS import)
6. Privacy policy section on SMS usage

---

## Contact Information
- Email: privacy@momoanalytics.com
- Support: In-app Help & Support
- Address: Accra, Ghana

---

**Last Updated:** February 18, 2026
