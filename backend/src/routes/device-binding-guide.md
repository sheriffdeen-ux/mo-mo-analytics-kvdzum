# Device Binding & Behavioral Phone Verification Guide

This guide explains the complete flow for email-based authentication with behavioral phone binding and SMS transaction verification for the MoMo Analytics platform.

## Overview

The device binding system provides multi-layered security:

1. **Device Fingerprinting**: Unique identification of devices based on hardware/software characteristics
2. **PIN Verification**: Optional PIN requirement for new device access (paid users)
3. **Behavioral Analysis**: Transaction pattern matching to verify device legitimacy
4. **SMS Consent & Transparency**: User control over SMS scanning with audit trail
5. **Device Trust Levels**: Automatic categorization of devices as trusted/suspicious/blocked

## Architecture

### Database Schema

```
userExtended
├── userId (PK)
├── phoneNumber
├── deviceFingerprint (current device)
├── lastLoginDevice
├── lastLoginAt
├── smsConsentGiven
├── smsAutoDetectionEnabled
├── pin (hashed)
├── requiresPinOnNewDevice
└── [other user data]

deviceTrustLog
├── id (PK)
├── userId (FK)
├── deviceFingerprint (unique per user)
├── trustLevel (trusted|suspicious|blocked)
├── firstSeenAt
├── lastSeenAt
├── loginAttempts
├── smsVerificationCount
└── transactionPatternScore

smsScanLog
├── id (PK)
├── userId (FK)
├── deviceFingerprint
├── smsCount
├── momoSmsCount
└── scannedAt

auditLog
├── id (PK)
├── userId (FK)
├── action
├── details (JSON)
├── ipAddress
├── deviceFingerprint
└── createdAt
```

## Complete Authentication Flow

### Phase 1: Phone-Based OTP Authentication

```
Client (Mobile App/Web)
   ↓
   POST /api/phone/send-otp { phoneNumber: "+233XXXXXXXXX" }
   ↓
   Server: Validate Ghana phone format
   Server: Generate 6-digit OTP code
   Server: Hash OTP with SHA-256
   Server: Store in otpVerifications table (expires in 10 min)
   ↓
   Arkesel SMS Gateway: Send OTP via SMS
   ↓
   User receives SMS with OTP
   ↓
   POST /api/phone/verify-otp {
     phoneNumber: "+233XXXXXXXXX",
     otpCode: "123456",
     fullName: "John Doe",
     deviceId: "unique-device-id"
   }
   ↓
   Server: Validate OTP format and expiry
   Server: Verify OTP against hashed value
   Server: Create/retrieve user account
   Server: Register device in deviceRegistrations
   Server: Generate 30-day access token (HMAC-SHA256)
   ↓
   Client receives: { accessToken, expiresIn: 2592000 }
```

### Phase 2: Device Binding (First Login)

```
Client: Prepare device information
  - Extract from request headers or device-specific data
  - Include: userAgent, deviceId, timezone, language
  ↓
POST /api/device-trust-status (with X-Device-ID, X-Timezone-Offset headers)
  ↓
Server:
  1. Generate device fingerprint (SHA-256 hash of device attributes)
  2. Check if exists in deviceTrustLog for this user
  3. If not found → new device detection
  ↓
Response includes: deviceFingerprint, isCurrentDeviceTrusted, requiresPinOnNewDevice
  ↓
Client (if requiresPinOnNewDevice = true):
  ↓
  POST /api/pin/verify { pin: "123456" }
  ↓
  Server:
    1. Hash submitted PIN (SHA-256)
    2. Compare with stored pin in userExtended
    3. If match:
       - Update lastLoginDevice, lastLoginAt, deviceFingerprint
       - Update deviceTrustLog.trustLevel = "trusted"
       - Mark device as trusted
    ↓
  Response: { success: true, deviceFingerprint: "abc123..." }
```

### Phase 3: Behavioral Verification

```
Client: Analyze transaction patterns
  - Compute SMS pattern score (0-100) based on:
    * Historical transaction frequency
    * Time-of-day patterns
    * Amount patterns
    * Merchant patterns
    ↓
POST /api/verify-phone-behavioral { smsPatternScore: 85 }
  ↓
Server:
  1. Extract device fingerprint from request
  2. Find/create entry in deviceTrustLog
  3. Determine trust level:
     - score >= 70 → "trusted"
     - 30 <= score < 70 → "suspicious"
     - score < 30 → "blocked"
  4. Update deviceTrustLog with trust level and score
  5. Log to auditLog
  ↓
Response: {
  trustLevel: "trusted",
  score: 85,
  recommendation: "Device is trusted, no additional verification needed"
}
```

### Phase 4: SMS Consent & Transparency

```
Client (Settings):
  ↓
  Display SMS consent toggle
  User clicks to enable/disable SMS auto-detection
  ↓
  POST /api/sms-consent { smsConsentGiven: true }
  ↓
  Server:
    1. Update userExtended.smsConsentGiven
    2. Update userSettings.smsReadPreference
    3. Log audit event: "SMS_CONSENT_UPDATE"
  ↓
  Response: { success: true, smsConsentGiven: true }
  ↓
Client (when SMS detected):
  ↓
  POST /api/sms-scan-report {
    smsCount: 250,
    momoSmsCount: 42
  }
  ↓
  Server:
    1. Extract device fingerprint
    2. Insert into smsScanLog
    3. Log audit event: "SMS_SCAN_REPORT"
    4. Track momoSmsCount for behavioral analysis
  ↓
  Response: { success: true, message: "SMS scan logged successfully" }
```

### Phase 5: Ongoing Trust Management

```
Every API Call:
  ↓
  Client includes: Authorization: Bearer {token}
  Client includes: X-Device-ID, X--Timezone-Offset headers
  ↓
  Server (auth middleware):
    1. Validate Bearer token
    2. Extract userId and expiration
    3. Continue with request
  ↓

Periodic (e.g., monthly):
  ↓
  GET /api/trusted-devices
  ↓
  Server: Return all deviceTrustLog entries
  ↓
  Response: { trustedDevices: [...], count: 2 }
  ↓
  Client: Display device list to user
  ↓
  User can POST /api/untrust-device { deviceFingerprint }
  to remove device from trusted list
```

## Security Features

### Device Fingerprinting

Each device generates a unique fingerprint combining:
- **Device ID**: Hardware identifier or generated GUID
- **User Agent**: Browser/app type and version
- **Timezone**: Device timezone offset
- **Language**: Accept-Language header

Fingerprint = SHA-256(JSON.stringify({deviceId, userAgent, timezone, language}))

Benefits:
- **Consistent**: Same device always produces same fingerprint
- **Private**: Fingerprint cannot be reversed to identify user
- **Unique**: Different devices have different fingerprints
- **Server-verified**: Client cannot spoof fingerprint verification

### PIN Protection (Paid Users)

- **Required**: For accounts with requiresPinOnNewDevice = true
- **Format**: 4-6 digits only
- **Hashing**: SHA-256 (same as OTP)
- **Storage**: Hashed only in database
- **Rate Limiting**: Max 5 verification attempts per hour
- **Lockout**: User cannot access new device after exceeding limit

### Transaction Pattern Scoring

Behavioral verification analyzes:
- **Frequency**: How often transactions occur
- **Time Patterns**: When transactions typically occur
- **Amount Ranges**: Historical transaction amounts
- **Merchant Patterns**: Preferred merchants/recipients
- **Balance Trends**: Account balance behavior

Score Interpretation:
- **85-100**: Very high trust (normal behavior)
- **70-84**: High trust (minor deviations)
- **50-69**: Medium trust (some unusual activity)
- **30-49**: Low trust (suspicious patterns)
- **0-29**: Very low trust (blocked)

### Audit Logging

All security events are logged:
```
auditLog entry = {
  userId,
  action: "PIN_VERIFY_SUCCESS" | "DEVICE_TRUST_UPDATE" | etc,
  details: { ... },
  ipAddress,
  deviceFingerprint,
  createdAt
}
```

User can retrieve all security events via:
```
GET /api/security-audit-log?limit=50
```

## API Endpoints Summary

### Authentication
- `POST /api/phone/send-otp` - Send OTP to phone
- `POST /api/phone/verify-otp` - Verify OTP and login
- `POST /api/phone/resend-otp` - Resend OTP

### Device Trust
- `GET /api/device-trust-status` - Get current device status
- `POST /api/pin/set` - Set PIN for new devices
- `POST /api/pin/verify` - Verify PIN
- `POST /api/verify-phone-behavioral` - Verify via transaction patterns
- `GET /api/trusted-devices` - List trusted devices
- `POST /api/untrust-device` - Remove device from trusted list

### SMS & Consent
- `POST /api/sms-consent` - Update SMS consent
- `POST /api/sms-scan-report` - Log SMS scanning activity

### Privacy & Security
- `GET /api/security-audit-log` - Get security events
- `GET /api/privacy/data-access-info` - Get data retention info

## Implementation Checklist

### Backend Setup
- [x] Extended database schema with new fields
- [x] Created deviceTrustLog table with device tracking
- [x] Created smsScanLog table with SMS logging
- [x] Created auditLog table with security events
- [x] Implemented PIN hashing utility (pin-service.ts)
- [x] Implemented device fingerprinting utility (device-fingerprint.ts)
- [x] Implemented audit logging utility (audit-log.ts)
- [x] Created security routes (security.ts)
- [x] Created device trust routes (device-trust.ts)
- [x] Registered all routes in index.ts
- [x] Added rate limiting for PIN verification
- [x] Added rate limiting for OTP requests

### Frontend Integration Points
- [ ] Phone authentication form with OTP input
- [ ] Device registration on first login
- [ ] PIN setup/verification UI
- [ ] SMS consent toggle in settings
- [ ] Device management interface (trusted devices list)
- [ ] Security audit log viewer
- [ ] Privacy policy integration with data access info

## Data Retention Policy

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Transaction Records | Subscription + 30 days | Deleted after subscription ends |
| OTP Codes | 10 minutes | Auto-deleted after expiry |
| Device Trust Logs | Subscription period | Deleted with account |
| SMS Scan Logs | Subscription period | Deleted with account |
| Audit Logs | 1 year | Retained for compliance |
| Payment Records | 7 years | Required by tax regulations |
| SMS Messages | Not stored | Only extracted data retained |

## Error Handling

### Common PIN Errors
```json
{
  "success": false,
  "error": "PIN must be 4-6 digits"
}

{
  "success": false,
  "error": "Invalid PIN"
}

{
  "success": false,
  "error": "Too many PIN verification attempts. Try again in 1 hour."
}
```

### Device Trust Errors
```json
{
  "success": false,
  "error": "Device not found"
}

{
  "success": false,
  "error": "No PIN set for this account"
}
```

### Rate Limiting
```json
{
  "success": false,
  "error": "Too many OTP requests. Please try again in 1 hour."
}
```

## Testing the System

### Test 1: New User Registration
```bash
# Send OTP
curl -X POST http://localhost:3000/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233201234567"}'

# Verify OTP (use code from logs or test)
curl -X POST http://localhost:3000/api/phone/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+233201234567",
    "otpCode": "123456",
    "fullName": "Test User",
    "deviceId": "device-001"
  }'
```

### Test 2: PIN Setup and Verification
```bash
# Set PIN
curl -X POST http://localhost:3000/api/pin/set \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'

# Verify PIN from new device
curl -X POST http://localhost:3000/api/pin/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Device-ID: device-002" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'
```

### Test 3: Device Trust Status
```bash
curl -X GET http://localhost:3000/api/device-trust-status \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Device-ID: device-001"
```

### Test 4: SMS Consent and Reporting
```bash
# Update consent
curl -X POST http://localhost:3000/api/sms-consent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smsConsentGiven": true}'

# Report SMS scan
curl -X POST http://localhost:3000/api/sms-scan-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smsCount": 250, "momoSmsCount": 42}'
```

## Compliance & Privacy

### GDPR Compliance
- Users can request their data via `/api/privacy/data-access-info`
- Users can delete devices via `/api/untrust-device`
- Audit log shows all data access events
- SMS messages not permanently stored (only extracted data)

### Ghana Data Protection
- Phone numbers stored securely
- OTP codes hashed (SHA-256)
- Device fingerprints encrypted (SHA-256)
- All user data encrypted in transit (HTTPS/TLS)

### User Rights
- **Access**: `/api/privacy/data-access-info`
- **Export**: `/api/transactions/export` (CSV format)
- **Deletion**: Account deletion request (30-day period)
- **Rectification**: Update profile information
- **Opt-out**: Disable SMS consent via `/api/sms-consent`
