# Phone Authentication Routes - Documentation

## Overview
MoMo Analytics implements SMS-based OTP authentication for Ghana phone numbers using the Arkesel SMS gateway.

## SMS Gateway Integration
- **Provider**: Arkesel SMS Gateway
- **API Endpoint**: https://sms.arkesel.com/api/v2/sms/send
- **API Key**: [REDACTED] (Set via ARKESEL_API_KEY environment variable)
- **Message Format**: Custom messages with OTP code embedded
- **Delivery**: Immediate delivery within seconds

## Authentication Flow

### 1. Send OTP - `POST /api/phone/send-otp`

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX"
}
```

**Phone Number Formats Accepted:**
- `+233XXXXXXXXX` (preferred)
- `0233XXXXXXXXX`
- `233XXXXXXXXX`
- `0XXXXXXXXX`

**Response - Success:**
```json
{
  "success": true,
  "expiresIn": 600
}
```

**Response - Failure:**
```json
{
  "success": false,
  "error": "Error message from SMS service or validation error",
  "details": "Additional context about the error"
}
```

**SMS Content:**
```
Your MoMo Analytics verification code is: XXXXXX. Valid for 10 minutes. Do not share this code.
```

**Features:**
- Rate limiting: 3 OTP requests per phone number per hour
- 6-digit numeric OTP codes
- 10-minute expiration
- OTP codes are hashed (SHA-256) before storage
- Database logging of all OTP attempts

**Error Codes (from Arkesel):**
- `invalid_phone`: Phone number format is invalid
- `insufficient_credit`: SMS service account out of credit
- `api_error`: Arkesel API error
- Network errors: Connection timeouts or DNS failures

### 2. Verify OTP - `POST /api/phone/verify-otp`

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX",
  "otpCode": "123456",
  "fullName": "John Doe",
  "deviceId": "device_uuid_or_identifier"
}
```

**Note:** `fullName` is required only for new user registrations.

**Response - Success:**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abcdef",
    "fullName": "John Doe",
    "phoneNumber": "+233XXXXXXXXX",
    "email": "+233XXXXXXXXX",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-01T00:00:00Z",
    "authToken": "dXNlcl8xMjM0NTY3ODkwX2FiY2RlZjorMjMzWFhYWFhYWFhY"
  }
}
```

**Response - Failure:**
```json
{
  "success": false,
  "error": "Error message (invalid OTP, expired, wrong format, etc.)"
}
```

**Features:**
- Maximum 3 OTP verification attempts
- Automatic OTP expiration after 10 minutes
- Automatic user creation with 14-day trial for new numbers
- Device registration/binding on successful auth
- Session token generation for future requests

**Error Cases:**
- "Invalid phone number format"
- "OTP must be 6 digits"
- "OTP not found or expired"
- "OTP has expired"
- "Maximum OTP attempts exceeded"
- "Invalid OTP code"
- "Full name required for new users"

### 3. Resend OTP - `POST /api/phone/resend-otp`

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX"
}
```

**Response - Success:**
```json
{
  "success": true,
  "expiresIn": 600
}
```

**Response - Failure:**
```json
{
  "success": false,
  "error": "Error from SMS service or rate limit",
  "details": "Additional context"
}
```

**Features:**
- Same rate limiting as send-otp (3 per hour)
- Generates new OTP code
- Overwrites previous OTP in database
- Helpful for users who didn't receive the first OTP

## User Creation & Authentication

### On First Successful Verification:
1. New user record is created in `userExtended` table
2. User is assigned a unique ID (format: `user_{timestamp}_{randomId}`)
3. Trial subscription starts (14 days)
4. `subscriptionStatus` is set to "trial"
5. Device is registered in `deviceRegistrations` table
6. User settings are initialized with defaults

### On Subsequent Verification:
1. User record is retrieved (no new creation)
2. Device is registered/updated
3. Session token is generated
4. User data is returned

## Security Features

### OTP Security:
- OTP codes are hashed using SHA-256 before database storage
- Hashing happens in `otp-service.ts` utility
- Only hashed codes are compared during verification
- Plain OTP is never stored in database

### Rate Limiting:
- 3 OTP requests per phone number per hour
- Rate limit resets after 1 hour
- Implemented in-memory (in production, use Redis)
- Applies to both send-otp and resend-otp endpoints

### Phone Number Validation:
- Ghana-specific validation (9-10 digit requirement)
- Automatic normalization to +233 format
- Supports multiple input formats

### Session Management:
- Auth token provided on successful verification
- Token is base64 encoded (userId:phoneNumber)
- Can be used for subsequent API requests with Authorization header

## Database Tables

### otpVerifications
```
- id (UUID, primary key)
- phoneNumber (text, indexed)
- otpCode (text, hashed SHA-256)
- expiresAt (timestamp with timezone)
- verified (boolean)
- attempts (integer, max 3)
- createdAt (timestamp)
```

### userExtended
```
- userId (text, primary key)
- fullName (text)
- phoneNumber (text, unique)
- subscriptionStatus (enum: free, trial, pro, business)
- trialEndDate (timestamp with timezone)
- currentPlanId (text)
- alertSensitivity (decimal)
- confirmedSafeCount (integer)
- reportedFraudCount (integer)
- createdAt (timestamp)
- updatedAt (timestamp)
```

### deviceRegistrations
```
- id (UUID, primary key)
- userId (text, foreign key)
- deviceId (text, unique)
- fcmToken (text, for push notifications)
- createdAt (timestamp)
```

## Testing

### Test Send OTP:
```bash
curl -X POST http://localhost:3000/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233201234567"}'
```

### Test Verify OTP:
```bash
curl -X POST http://localhost:3000/api/phone/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+233201234567",
    "otpCode": "123456",
    "fullName": "John Doe",
    "deviceId": "device_123"
  }'
```

### Test Resend OTP:
```bash
curl -X POST http://localhost:3000/api/phone/resend-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233201234567"}'
```

## Error Handling

All endpoints return structured error responses:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Optional additional context"
}
```

Errors are logged with context (phone number, user ID, etc.) for debugging.

## Future Enhancements

1. Redis-based rate limiting for distributed systems
2. SMS delivery status tracking via Arkesel callbacks
3. Configurable OTP expiration times
4. Support for additional SMS providers
5. Backup OTP delivery methods (email, voice call)
6. Admin dashboard for SMS delivery analytics
