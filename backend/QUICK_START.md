# Quick Start Guide - Security & Device Binding Features

## 🚀 5-Minute Overview

The MoMo Analytics backend now includes comprehensive device binding and behavioral phone verification. Here's what you need to know.

---

## 📍 Key Files Location

```
src/
├── utils/
│   ├── pin-service.ts              # PIN hashing/verification
│   ├── device-fingerprint.ts       # Device identification
│   └── audit-log.ts                # Event logging
├── routes/
│   ├── security.ts                 # PIN & SMS endpoints
│   ├── device-trust.ts             # Device management endpoints
│   ├── security-docs.md            # Detailed API reference
│   └── device-binding-guide.md     # Full implementation guide
└── db/
    └── schema.ts                   # Extended with new tables
```

---

## 🔐 12 New API Endpoints

### Authentication & Device (Existing + Enhanced)
```
POST /api/phone/send-otp           # Send OTP
POST /api/phone/verify-otp         # Verify OTP (now with device binding)
POST /api/phone/resend-otp         # Resend OTP
```

### PIN Management (New)
```
POST /api/pin/set                  # Set PIN for account
POST /api/pin/verify               # Verify PIN (rate limited: 5/hour)
```

### SMS & Consent (New)
```
POST /api/sms-consent              # Update SMS consent
POST /api/sms-scan-report          # Log SMS scanning
```

### Device Trust (New)
```
GET  /api/device-trust-status      # Get current device status
POST /api/verify-phone-behavioral  # Behavioral verification
GET  /api/trusted-devices          # List trusted devices
POST /api/untrust-device           # Remove device
```

### Security & Privacy (New)
```
GET  /api/security-audit-log       # Get audit events
GET  /api/privacy/data-access-info # Privacy information
```

---

## 🔧 Basic Implementation Example

### 1. User Registration with Device Binding
```typescript
// Client sends:
POST /api/phone/send-otp
{ "phoneNumber": "+233201234567" }

// Client receives OTP via SMS, then verifies:
POST /api/phone/verify-otp
{
  "phoneNumber": "+233201234567",
  "otpCode": "123456",
  "fullName": "John Doe",
  "deviceId": "device-abc123"
}

// Response includes:
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 2592000  // 30 days
}
```

### 2. PIN Setup (Paid Users)
```typescript
POST /api/pin/set
Authorization: Bearer {token}
{ "pin": "1234" }

// Sets requiresPinOnNewDevice = true
```

### 3. New Device Access with PIN
```typescript
// From new device:
POST /api/pin/verify
Authorization: Bearer {token}
X-Device-ID: device-xyz789
{ "pin": "1234" }

// Response:
{
  "success": true,
  "deviceFingerprint": "abc123hash..."
}
```

### 4. Check Device Trust
```typescript
GET /api/device-trust-status
Authorization: Bearer {token}
X-Device-ID: device-abc123

// Response:
{
  "success": true,
  "deviceFingerprint": "abc123hash...",
  "isCurrentDeviceTrusted": true,
  "requiresPinOnNewDevice": true,
  "pinSetup": true
}
```

### 5. View Trusted Devices
```typescript
GET /api/trusted-devices
Authorization: Bearer {token}

// Response:
{
  "trustedDevices": [
    {
      "deviceFingerprint": "abc123...",
      "trustLevel": "trusted",
      "lastSeenAt": "2024-01-15T10:30:00Z",
      "transactionPatternScore": 85
    }
  ],
  "count": 1
}
```

### 6. SMS Consent
```typescript
POST /api/sms-consent
Authorization: Bearer {token}
{ "smsConsentGiven": true }

// Report scanning activity:
POST /api/sms-scan-report
Authorization: Bearer {token}
{ "smsCount": 250, "momoSmsCount": 42 }
```

### 7. View Security Events
```typescript
GET /api/security-audit-log?limit=50
Authorization: Bearer {token}

// Returns all security events (PIN, auth, device trust, SMS)
```

### 8. Privacy & Data Info
```typescript
GET /api/privacy/data-access-info
Authorization: Bearer {token}

// Shows: data collected, retention periods, user rights
```

---

## 🗄️ Database Tables

### New Fields in userExtended
```sql
phoneNumber TEXT                              -- User's phone
deviceFingerprint TEXT                        -- Current device hash
lastLoginDevice TEXT                          -- Last device used
lastLoginAt TIMESTAMP                         -- Last login time
smsConsentGiven BOOLEAN (default false)       -- SMS consent
smsAutoDetectionEnabled BOOLEAN (default false) -- SMS auto-detection
pin TEXT                                      -- Hashed PIN
requiresPinOnNewDevice BOOLEAN (default false) -- PIN requirement
```

### New Tables
```sql
-- Device trust tracking
deviceTrustLog (id, userId, deviceFingerprint, trustLevel, firstSeenAt, lastSeenAt, loginAttempts, smsVerificationCount, transactionPatternScore)

-- SMS transparency
smsScanLog (id, userId, deviceFingerprint, smsCount, momoSmsCount, scannedAt)

-- Security events
auditLog (id, userId, action, details, ipAddress, deviceFingerprint, createdAt)
```

---

## 🔒 Security Features at a Glance

| Feature | What It Does | Where |
|---------|-------------|-------|
| **Device Fingerprinting** | Unique device ID via SHA-256 hash | `/api/device-trust-status` |
| **PIN Protection** | 4-6 digit PIN for new devices | `/api/pin/set`, `/api/pin/verify` |
| **Behavioral Verification** | Transaction pattern trust scoring | `/api/verify-phone-behavioral` |
| **SMS Consent** | User control over SMS scanning | `/api/sms-consent` |
| **Audit Logging** | Records all security events | `/api/security-audit-log` |
| **Rate Limiting** | Prevents brute force (5 PIN/hour) | PIN verification endpoint |

---

## 📊 Request/Response Patterns

### All endpoints return consistent format:
```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Common Headers Required
```
Authorization: Bearer {accessToken}    // For protected routes
Content-Type: application/json         // For POST requests
X-Device-ID: device-identifier        // Optional, for device binding
X-Timezone-Offset: -300               // Optional, for device fingerprint
```

---

## ⚡ Implementation Checklist

For backend developers:
- [x] Code complete - ready to use
- [x] Database schema - all tables created
- [x] Routes registered - all endpoints active
- [x] Documentation - comprehensive guides provided
- [x] Error handling - all cases covered
- [x] Logging - all operations logged

For frontend developers:
- [ ] Implement phone OTP flow
- [ ] Add PIN setup UI (settings)
- [ ] Add PIN entry for new devices
- [ ] Add SMS consent checkbox
- [ ] Add device management page
- [ ] Add security audit log viewer
- [ ] Add privacy policy page with data info

---

## 🧪 Quick Test Commands

```bash
# Send OTP
curl -X POST http://localhost:3000/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233201234567"}'

# Set PIN
curl -X POST http://localhost:3000/api/pin/set \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'

# Verify PIN
curl -X POST http://localhost:3000/api/pin/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Device-ID: device-001" \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}'

# Check device trust
curl -X GET http://localhost:3000/api/device-trust-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# List trusted devices
curl -X GET http://localhost:3000/api/trusted-devices \
  -H "Authorization: Bearer YOUR_TOKEN"

# Enable SMS consent
curl -X POST http://localhost:3000/api/sms-consent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smsConsentGiven": true}'

# View audit log
curl -X GET "http://localhost:3000/api/security-audit-log?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# View privacy info
curl -X GET http://localhost:3000/api/privacy/data-access-info \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Documentation Road Map

### For API Details
→ Read: `src/routes/security-docs.md`
- Endpoint request/response formats
- Parameter descriptions
- Error codes
- Real-world examples

### For Architecture & Design
→ Read: `src/routes/device-binding-guide.md`
- System architecture
- Authentication flows
- Database schema
- Implementation patterns

### For Overview
→ Read: `IMPLEMENTATION_SUMMARY.md`
- What was implemented
- Files created/modified
- Key features
- Testing examples

### For Quick Reference
→ Read: `SECURITY_FEATURES.md`
- Endpoint list
- Feature breakdown
- Data retention
- Audit events

---

## 🚨 Common Issues & Solutions

### Issue: "PIN must be 4-6 digits"
**Solution**: Ensure PIN is exactly 4-6 digits: `"pin": "1234"`

### Issue: "Too many PIN verification attempts"
**Solution**: Rate limit (5/hour). Wait 1 hour or use different user.

### Issue: "Device not found"
**Solution**: Device may need to be verified first via `/api/pin/verify`

### Issue: "No PIN set for this account"
**Solution**: User needs to set PIN first: `/api/pin/set`

---

## 🔄 Common Workflows

### Scenario 1: Free User First Login
```
1. POST /api/phone/send-otp
2. Receive OTP in SMS
3. POST /api/phone/verify-otp
4. Get 30-day token
5. No PIN required (optional)
```

### Scenario 2: Paid User Setup
```
1. POST /api/phone/verify-otp (login)
2. POST /api/pin/set (setup PIN)
3. GET /api/device-trust-status (check status)
4. POST /api/sms-consent (enable SMS)
```

### Scenario 3: New Device Access
```
1. POST /api/phone/verify-otp (from new device)
2. GET /api/device-trust-status (device not recognized)
3. POST /api/pin/verify (verify with PIN)
4. Device marked as trusted
```

### Scenario 4: Privacy Review
```
1. GET /api/privacy/data-access-info (see what's collected)
2. GET /api/security-audit-log (see all events)
3. GET /api/trusted-devices (see devices)
4. POST /api/untrust-device (remove device if needed)
```

---

## 💾 Data Retention (IMPORTANT)

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| SMS Text | Not stored | Only extracted data |
| Transactions | Subscription + 30 days | Deleted after |
| OTP Codes | 10 minutes | Auto-deleted |
| Audit Logs | 1 year | For compliance |
| Device Logs | Subscription period | Per-user basis |
| Payment Records | 7 years | Tax requirement |

---

## 🎯 Key Takeaways

1. **Device Fingerprinting** - Every device gets unique SHA-256 hash
2. **PIN Protection** - Optional 4-6 digit PIN for extra security
3. **Behavioral Verification** - Transaction patterns create trust score (0-100)
4. **Audit Logging** - Every security event is logged and user-accessible
5. **SMS Consent** - Users have explicit control over SMS scanning
6. **Privacy First** - SMS texts never stored, only extracted data

---

## 📞 Support

- **API Reference**: `src/routes/security-docs.md`
- **Implementation Details**: `src/routes/device-binding-guide.md`
- **Quick Reference**: `SECURITY_FEATURES.md`
- **Completion Status**: `COMPLETION_CHECKLIST.md`

All code is production-ready and fully documented.

---

**Ready to use!** 🚀
