# MoMo Analytics - Security Features Quick Reference

## New Security Endpoints

### PIN Management
```
POST /api/pin/set
POST /api/pin/verify (rate limited: 5/hour)
```

### SMS & Consent
```
POST /api/sms-consent
POST /api/sms-scan-report
```

### Device Trust
```
GET  /api/device-trust-status
POST /api/verify-phone-behavioral
GET  /api/trusted-devices
POST /api/untrust-device
```

### Security & Privacy
```
GET /api/security-audit-log
GET /api/privacy/data-access-info
```

---

## Key Implementation Files

### Utilities (3 new files)
- **src/utils/pin-service.ts** - PIN hashing/verification
- **src/utils/device-fingerprint.ts** - Device identification
- **src/utils/audit-log.ts** - Event logging

### Routes (2 new files)
- **src/routes/security.ts** - PIN & SMS consent endpoints
- **src/routes/device-trust.ts** - Device management endpoints

### Database Schema
- **Extended userExtended**: 8 new security fields
- **New deviceTrustLog**: Device tracking (trust levels, login attempts, scores)
- **New smsScanLog**: SMS transparency audit trail
- **New auditLog**: Security event logging

### Documentation (3 new files)
- **src/routes/security-docs.md** - Detailed API reference
- **src/routes/device-binding-guide.md** - Implementation guide
- **IMPLEMENTATION_SUMMARY.md** - Overview of all changes

---

## Security Features Breakdown

### 1. Device Fingerprinting
- **What**: Unique device identification using hardware/software characteristics
- **How**: SHA-256 hash of (deviceId + userAgent + timezone + language)
- **Why**: Enable per-device trust tracking without storing sensitive data
- **Privacy**: Fingerprint cannot be reversed (one-way hash)

### 2. PIN Protection (Paid Users)
- **What**: Optional numeric PIN for new device verification
- **Format**: 4-6 digits only
- **Storage**: SHA-256 hashed (never plaintext)
- **Rate Limit**: 5 attempts per hour per user
- **When Required**: `requiresPinOnNewDevice = true` on userExtended

### 3. Behavioral Verification
- **What**: AI-powered device trust scoring
- **Score**: 0-100 based on transaction patterns
- **Trust Levels**:
  - ≥70: Trusted (normal behavior)
  - 30-69: Suspicious (unusual activity)
  - <30: Blocked (potential fraud)
- **Data**: SMS patterns, transaction frequency, amounts, merchants

### 4. SMS Consent Management
- **What**: User control over SMS scanning
- **Storage**: `smsConsentGiven` boolean on userExtended
- **Compliance**: GDPR/data protection regulations
- **Transparency**: All SMS scans logged to `smsScanLog` table
- **Audit Trail**: Every consent change recorded in `auditLog`

### 5. Comprehensive Audit Logging
- **Events Tracked**:
  - PIN setup/verification attempts
  - Device trust changes
  - SMS consent updates
  - Auth login/logout
  - Behavioral verification
- **Details Captured**: Timestamp, IP address, device fingerprint
- **Retention**: 1 year for compliance
- **Access**: Users can view via `/api/security-audit-log`

### 6. Privacy & Data Retention
- **Endpoint**: `/api/privacy/data-access-info`
- **Shows**:
  - All data collected (with counts)
  - Retention periods per type
  - User rights (access, export, delete, etc.)
- **Data Types**:
  - Transactions: Subscription period + 30 days
  - Audit logs: 1 year
  - Device logs: Subscription period
  - SMS messages: Not stored (extracted data only)

---

## Database Schema Summary

### userExtended (extended fields)
```sql
-- New security fields
phoneNumber TEXT
deviceFingerprint TEXT
lastLoginDevice TEXT
lastLoginAt TIMESTAMP
smsConsentGiven BOOLEAN (default false)
smsAutoDetectionEnabled BOOLEAN (default false)
pin TEXT (hashed)
requiresPinOnNewDevice BOOLEAN (default false)
```

### deviceTrustLog (new table)
```sql
id UUID PRIMARY KEY
userId TEXT NOT NULL
deviceFingerprint TEXT NOT NULL
trustLevel TEXT (trusted|suspicious|blocked)
firstSeenAt TIMESTAMP NOT NULL
lastSeenAt TIMESTAMP NOT NULL
loginAttempts INTEGER DEFAULT 0
smsVerificationCount INTEGER DEFAULT 0
transactionPatternScore DECIMAL(5,2)
```

### smsScanLog (new table)
```sql
id UUID PRIMARY KEY
userId TEXT NOT NULL
deviceFingerprint TEXT NOT NULL
smsCount INTEGER NOT NULL
momoSmsCount INTEGER NOT NULL
scannedAt TIMESTAMP NOT NULL
```

### auditLog (new table)
```sql
id UUID PRIMARY KEY
userId TEXT
action TEXT NOT NULL
details JSONB
ipAddress TEXT
deviceFingerprint TEXT
createdAt TIMESTAMP NOT NULL
```

---

## Rate Limiting

| Operation | Limit | Reset Time |
|-----------|-------|-----------|
| PIN Verification | 5 attempts | 1 hour |
| OTP Requests | 3 requests | 1 hour |

---

## Audit Events Logged

| Action | Description |
|--------|-------------|
| PIN_SET_SUCCESS | PIN successfully configured |
| PIN_SET_FAILED | PIN setup failed |
| PIN_VERIFY_SUCCESS | PIN verification passed |
| PIN_VERIFY_FAILED | PIN verification failed |
| AUTH_LOGIN_SUCCESS | User login successful |
| AUTH_LOGIN_FAILED | User login failed |
| DEVICE_BEHAVIORAL_VERIFY | Device verified by patterns |
| DEVICE_TRUST_UPDATE | Device trust level changed |
| DEVICE_UNTRUST | Device removed from trusted list |
| SMS_CONSENT_UPDATE | SMS consent preference changed |
| SMS_SCAN_REPORT | SMS scanning activity logged |

---

## Quick Integration Checklist

### For Backend
- [x] Database schema extended with security fields
- [x] Three new tables created (deviceTrustLog, smsScanLog, auditLog)
- [x] PIN service utility created
- [x] Device fingerprinting utility created
- [x] Audit logging utility created
- [x] Security routes implemented (PIN, SMS, device trust)
- [x] Device trust routes implemented (behavioral, management)
- [x] All routes registered in index.ts
- [x] Rate limiting implemented for PIN verification
- [x] Comprehensive documentation created

### For Frontend (Next Steps)
- [ ] Phone authentication form with OTP
- [ ] Device registration on first login
- [ ] PIN setup/entry UI
- [ ] SMS consent checkbox in settings
- [ ] Device management page (trusted devices)
- [ ] Security audit log viewer
- [ ] Privacy policy with data access info

---

## Example Flows

### New User Registration
```
1. POST /api/phone/send-otp
2. User receives SMS with OTP code
3. POST /api/phone/verify-otp (with OTP and fullName)
4. Server creates user account with 14-day trial
5. Server returns accessToken (30-day expiration)
6. Device fingerprint stored in userExtended
```

### Paid User First Login from New Device
```
1. User logs in with OTP (existing flow)
2. GET /api/device-trust-status
3. Server detects new device (no match in deviceTrustLog)
4. Server returns: requiresPinOnNewDevice = true
5. POST /api/pin/verify { pin: "1234" }
6. Server updates deviceTrustLog with trust level = "trusted"
7. User can now access all features
```

### Behavioral Verification
```
1. Client analyzes SMS patterns, creates score
2. POST /api/verify-phone-behavioral { smsPatternScore: 85 }
3. Server calculates trust level based on score
4. Server updates deviceTrustLog.trustLevel
5. Response: { trustLevel: "trusted", score: 85 }
```

### SMS Consent & Reporting
```
1. User enables SMS consent in settings
2. POST /api/sms-consent { smsConsentGiven: true }
3. App detects and scans SMS messages
4. POST /api/sms-scan-report { smsCount: 250, momoSmsCount: 42 }
5. Server logs to smsScanLog and auditLog
6. User can see transparency via /api/security-audit-log
```

---

## Logging Examples

```typescript
// PIN operations
app.logger.info({ userId }, "Setting PIN");
app.logger.warn({ userId }, "PIN verification rate limit exceeded");
app.logger.error({ err, userId }, "Failed to set PIN");

// Device trust
app.logger.info({ userId, deviceId, trustLevel }, "Device verified using behavioral patterns");
app.logger.warn({ userId, transactionId }, "Unauthorized access attempt");

// SMS operations
app.logger.info({ userId, momoSmsCount }, "SMS scan logged");

// Auth events
app.logger.info({ userId, phoneNumber }, "User authenticated via OTP");
```

---

## Error Responses

### PIN Errors
```json
{"success": false, "error": "PIN must be 4-6 digits"}
{"success": false, "error": "Invalid PIN"}
{"success": false, "error": "Too many PIN verification attempts. Try again in 1 hour."}
```

### Rate Limiting
```json
{"success": false, "error": "Too many OTP requests. Please try again in 1 hour."}
```

### Device Trust Errors
```json
{"success": false, "error": "Device not found"}
{"success": false, "error": "No PIN set for this account"}
```

---

## Data Privacy

### What's NOT Stored
- SMS message text
- Plain-text passwords or PINs
- Raw device identifiers (only hashes)
- Payment card data (handled by Paystack)

### What IS Stored (Securely)
- Hashed PINs (SHA-256)
- Device fingerprints (SHA-256 hash)
- Hashed OTP codes (SHA-256)
- Transaction metadata (amounts, types, dates)
- User preferences (consent, limits, merchants)

### Retention Periods
- SMS text: Not stored (only extracted data)
- Transactions: Subscription + 30 days
- OTP codes: 10 minutes
- Audit logs: 1 year
- Device logs: Subscription period
- Payment records: 7 years (tax requirement)

---

## Production Considerations

### Current Implementation
- Uses in-memory Maps for rate limiting
- Single-instance deployment ready

### For Multi-Instance Deployment
- Replace in-memory rate limiting with Redis
- Consider distributed audit logging
- Use database-level backup/replication

### Security Hardening
- Enable HTTPS/TLS for all traffic
- Implement DDoS protection
- Set up WAF (Web Application Firewall)
- Regular security audits and penetration testing
- Monitor audit logs for suspicious activity
- Implement alerting for failed authentication attempts

---

## Support & References

### Documentation Files
1. **security-docs.md** - Complete API endpoint reference
2. **device-binding-guide.md** - Implementation architecture and flows
3. **IMPLEMENTATION_SUMMARY.md** - Overview of all changes

### Code Files
1. **src/utils/pin-service.ts** - PIN utilities
2. **src/utils/device-fingerprint.ts** - Device utilities
3. **src/utils/audit-log.ts** - Logging utilities
4. **src/routes/security.ts** - PIN/SMS/consent endpoints
5. **src/routes/device-trust.ts** - Device management endpoints

---

## Version Information
- **Implementation Date**: 2024
- **Status**: Production Ready
- **Framework**: Fastify + Drizzle ORM + Better Auth
- **Database**: PostgreSQL (Neon/PGlite)
