# Security & Device Trust API Documentation

This document describes the security and device trust endpoints for behavioral phone binding and device verification.

## Overview

The security system provides:
- **PIN Management**: Set and verify PINs for new device verification
- **Device Trust**: Track device trust levels and behavioral verification
- **SMS Consent**: Manage SMS scanning and consent preferences
- **Audit Logging**: Comprehensive security event tracking
- **Data Privacy**: Access information about data collection and retention

## PIN Management Endpoints

### POST /api/pin/set
Set or update a PIN for device verification (required for paid plan users).

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "pin": "123456"
}
```

**PIN Requirements**:
- Must be 4-6 digits
- Used to verify new device access

**Response** (Success):
```json
{
  "success": true,
  "message": "PIN set successfully"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "PIN must be 4-6 digits"
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/pin/set \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456"}'
```

---

### POST /api/pin/verify
Verify PIN when accessing from a new device. Rate limited to 5 attempts per hour.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "pin": "123456"
}
```

**Device Identification Headers** (Optional but recommended):
- `X-Device-ID`: Unique device identifier
- `X-Device-Fingerprint`: Device fingerprint (base64 encoded)
- `User-Agent`: Browser/app user agent
- `X-Timezone-Offset`: Timezone offset in minutes
- `Accept-Language`: Language preferences

**Response** (Success):
```json
{
  "success": true,
  "message": "Device verified and trusted",
  "deviceFingerprint": "abc123def456..."
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid PIN"
}
```

**Response** (Rate Limited):
```json
{
  "success": false,
  "error": "Too many PIN verification attempts. Try again in 1 hour."
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/pin/verify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Device-ID: device-123" \
  -H "Content-Type: application/json" \
  -d '{"pin": "123456"}'
```

---

## SMS Consent & Scanning

### POST /api/sms-consent
Update SMS scanning and consent preferences.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "smsConsentGiven": true
}
```

**Response** (Success):
```json
{
  "success": true,
  "smsConsentGiven": true
}
```

**Consent Behavior**:
- When `true`: User allows SMS scanning for MoMo transaction detection
- When `false`: SMS auto-detection is disabled
- Logged in audit trail for compliance

---

### POST /api/sms-scan-report
Report SMS scanning activity for transparency and audit purposes.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "smsCount": 250,
  "momoSmsCount": 42
}
```

**Fields**:
- `smsCount`: Total SMS messages scanned
- `momoSmsCount`: SMS messages containing MoMo transactions

**Response**:
```json
{
  "success": true,
  "message": "SMS scan logged successfully"
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/sms-scan-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smsCount": 250, "momoSmsCount": 42}'
```

---

## Device Trust Management

### GET /api/device-trust-status
Get the trust status of the current device.

**Authentication**: Required (Bearer token)

**Request Headers** (Optional):
- `X-Device-ID`: Device identifier
- `User-Agent`: Browser/app user agent
- `X-Timezone-Offset`: Timezone offset

**Response**:
```json
{
  "success": true,
  "deviceFingerprint": "abc123def456...",
  "isCurrentDeviceTrusted": true,
  "isCurrentDevice": true,
  "lastLoginAt": "2024-01-15T10:30:00.000Z",
  "requiresPinOnNewDevice": true,
  "pinSetup": true
}
```

**Fields**:
- `deviceFingerprint`: Hash of current device characteristics
- `isCurrentDeviceTrusted`: Whether device is in trusted list
- `isCurrentDevice`: Whether this is the last registered device
- `lastLoginAt`: Last login timestamp
- `requiresPinOnNewDevice`: Whether PIN is required for new devices
- `pinSetup`: Whether PIN is configured

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/device-trust-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/verify-phone-behavioral
Verify device using behavioral phone transaction patterns (AI-powered).

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "smsPatternScore": 85,
  "description": "Device patterns match historical transaction behavior"
}
```

**Fields**:
- `smsPatternScore`: 0-100 trust score (optional, computed if not provided)
- `description`: Additional context for verification

**Response**:
```json
{
  "success": true,
  "trustLevel": "trusted",
  "score": 85,
  "message": "Device trust level: trusted",
  "recommendation": "Device is trusted, no additional verification needed"
}
```

**Trust Levels**:
- `trusted`: Score >= 70, device is safe
- `suspicious`: Score 30-70, SMS verification recommended
- `blocked`: Score < 30, contact support required

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/verify-phone-behavioral \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"smsPatternScore": 85}'
```

---

### GET /api/trusted-devices
Get list of all trusted devices for the user.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "success": true,
  "trustedDevices": [
    {
      "deviceFingerprint": "abc123def456...",
      "trustLevel": "trusted",
      "firstSeenAt": "2024-01-10T09:00:00.000Z",
      "lastSeenAt": "2024-01-15T10:30:00.000Z",
      "loginAttempts": 15,
      "transactionPatternScore": 85
    },
    {
      "deviceFingerprint": "xyz789uvw012...",
      "trustLevel": "suspicious",
      "firstSeenAt": "2024-01-14T14:00:00.000Z",
      "lastSeenAt": "2024-01-14T14:30:00.000Z",
      "loginAttempts": 1,
      "transactionPatternScore": 45
    }
  ],
  "count": 2
}
```

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/trusted-devices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST /api/untrust-device
Remove a device from trusted list (mark as suspicious).

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "deviceFingerprint": "xyz789uvw012..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device removed from trusted list"
}
```

**Behavior**:
- Device trust level changes to `suspicious`
- Next access from this device may require PIN verification
- Logged in security audit trail

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/untrust-device \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceFingerprint": "xyz789uvw012..."}'
```

---

## Security & Privacy

### GET /api/device-trust-status
Already documented above - provides current device trust information.

---

### GET /api/security-audit-log
Get security audit log showing all security-related events.

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `limit`: Maximum number of entries to return (default: 50)

**Response**:
```json
{
  "success": true,
  "auditLog": [
    {
      "id": "uuid-123",
      "action": "PIN_VERIFY_SUCCESS",
      "details": {
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      "ipAddress": "192.168.1.1",
      "deviceFingerprint": "abc123def456...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "uuid-456",
      "action": "SMS_CONSENT_UPDATE",
      "details": {
        "consentGiven": true,
        "timestamp": "2024-01-15T10:25:00.000Z"
      },
      "ipAddress": "192.168.1.1",
      "deviceFingerprint": "abc123def456...",
      "createdAt": "2024-01-15T10:25:00.000Z"
    }
  ],
  "count": 2
}
```

**Audit Event Types**:
- `PIN_SET_SUCCESS`: PIN successfully set
- `PIN_SET_FAILED`: PIN setup failed
- `PIN_VERIFY_SUCCESS`: PIN verification successful
- `PIN_VERIFY_FAILED`: PIN verification failed
- `AUTH_LOGIN_SUCCESS`: User login successful
- `AUTH_LOGIN_FAILED`: User login failed
- `SMS_CONSENT_UPDATE`: SMS consent changed
- `SMS_SCAN_REPORT`: SMS scanning logged
- `DEVICE_BEHAVIORAL_VERIFY`: Device verified behaviorally
- `DEVICE_UNTRUST`: Device removed from trusted list

**Example cURL**:
```bash
curl -X GET "http://localhost:3000/api/security-audit-log?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/privacy/data-access-info
Get comprehensive information about data collection, retention, and user rights.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "success": true,
  "dataCollection": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "currentDate": "2024-01-15T10:30:00.000Z",
    "dataRetentionPeriod": "User subscription period + 30 days after cancellation"
  },
  "dataCategories": {
    "transactionRecords": {
      "count": 150,
      "description": "Mobile Money transactions analyzed for fraud detection",
      "retentionPolicy": "Retained for subscription period + 30 days"
    },
    "auditLogs": {
      "count": 45,
      "description": "Security events and user actions",
      "retentionPolicy": "Retained for 1 year"
    },
    "deviceLogs": {
      "count": 5,
      "description": "Device trust information and verification logs",
      "retentionPolicy": "Retained for subscription period"
    },
    "smsLogs": {
      "count": 12,
      "description": "SMS scanning activity and MoMo transaction detection",
      "retentionPolicy": "Retained for subscription period"
    }
  },
  "userRights": {
    "accessData": "You can request all your personal data",
    "exportData": "You can export your transaction history as CSV",
    "deleteAccount": "You can request deletion of your account and data",
    "optOut": "You can disable notifications and data collection",
    "rectification": "You can request correction of inaccurate data"
  },
  "smsPolicy": {
    "smsConsentGiven": true,
    "smsAutoDetectionEnabled": true,
    "message": "You have provided consent for SMS-based fraud detection"
  }
}
```

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/privacy/data-access-info \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Device Fingerprinting

Device fingerprints are generated from:
- **Device ID**: Unique identifier from client
- **User Agent**: Browser/app information
- **Timezone**: Device timezone offset
- **Language**: Accept-Language header

The fingerprint is a SHA-256 hash of these combined attributes, ensuring:
- Consistency across sessions (same device = same fingerprint)
- Privacy protection (fingerprint cannot be reversed)
- Uniqueness (different devices have different fingerprints)

---

## Rate Limiting

- **PIN Verification**: 5 attempts per hour per user
- **OTP Requests**: 3 requests per hour per phone number
- **Pin Setting**: No limit (but only meaningful if PIN not previously set)

---

## Error Codes

### PIN Endpoints
- `PIN_INVALID_FORMAT`: PIN must be 4-6 digits
- `PIN_VERIFICATION_FAILED`: PIN doesn't match
- `PIN_RATE_LIMIT`: Too many attempts, try again later
- `USER_NOT_FOUND`: User account not found

### Device Trust
- `DEVICE_NOT_FOUND`: Device not in trusted list
- `INVALID_FINGERPRINT`: Device fingerprint invalid

### General
- `UNAUTHORIZED`: Missing or invalid authentication token
- `INTERNAL_ERROR`: Server error (500)

---

## Flow Examples

### New Device Access Flow (Paid Users)

1. **User logs in from new device**
2. User makes API call with device identifiers
3. Device fingerprint is generated and checked
4. If not trusted, server requires PIN verification
5. User calls `/api/pin/verify` with correct PIN
6. Device is marked as trusted
7. Future requests from this device don't require PIN

### Behavioral Verification Flow

1. **System detects new device**
2. Analyzes transaction history patterns
3. Checks SMS scanning behavior
4. Computes trust score (0-100)
5. Calls `/api/verify-phone-behavioral` with score
6. Device is marked as trusted, suspicious, or blocked
7. User can view trust status via `/api/device-trust-status`

### Privacy & Compliance Flow

1. **User wants to see their data**
2. Calls `/api/privacy/data-access-info`
3. Sees all data types collected and retention policies
4. Can call `/api/security-audit-log` to see all events
5. Can manage consent via `/api/sms-consent`
6. Can review trusted devices via `/api/trusted-devices`
