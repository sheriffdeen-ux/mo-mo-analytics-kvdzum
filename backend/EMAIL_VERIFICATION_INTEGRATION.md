# Email Verification Integration with Signup Flow

## Complete User Journey

### Step 1: Signup
```
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe",
  "phoneNumber": "+233201234567",
  "deviceId": "device-123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abc123",
    "fullName": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+233201234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-01-29T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

**What Happens:**
- User account created ✅
- 14-day trial activated ✅
- User settings initialized ✅
- Device registered ✅
- Access token generated ✅
- **Email NOT yet verified** ⏳

---

### Step 2: Request Verification Email
```
POST /api/auth/send-verification-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Development - REQUIRE_EMAIL_VERIFICATION=false):**
```json
{
  "success": true,
  "message": "Verification email sent",
  "otpCode": "123456"
}
```

**Response (Production - REQUIRE_EMAIL_VERIFICATION=true):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**What Happens:**
- OTP code generated (6 digits) ✅
- OTP code hashed with SHA-256 ✅
- Email prepared with HTML template ✅
- Email sent via Resend (if configured) ✅
- OTP expires in 5 minutes ✅
- In dev mode: OTP returned in response 📧

**Email Template Includes:**
```
Subject: Verify your email for MoMo Analytics

Content:
- Professional header with branding
- Personalized greeting
- 6-digit OTP code (32px, bold)
- 5-minute expiration timer
- 4-step verification instructions
- Security warning about code sharing
- Help links and footer
```

---

### Step 3: Verify Email with OTP
```
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "user@example.com",
  "otpCode": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "verified": true
}
```

**Response (Wrong Code):**
```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

**Response (Expired):**
```json
{
  "success": false,
  "error": "Verification code has expired"
}
```

**Response (Max Attempts):**
```json
{
  "success": false,
  "error": "Maximum verification attempts exceeded. Request a new code."
}
```

**What Happens:**
- OTP code hashed and compared (constant-time) ✅
- Expiration checked (5 minutes) ✅
- Verification marked as complete ✅
- In dev mode: Auto-approves any OTP 🔓
- Attempt counter incremented (3 max) ✅

---

### Step 4: Login (After Email Verified)
```
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "deviceId": "device-123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abc123",
    "fullName": "John Doe",
    "email": "user@example.com",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-01-29T10:30:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

**What Happens:**
- Email/password verified ✅
- Trial expiration checked ✅
- Device registered ✅
- Last login updated ✅
- Access token generated ✅
- **Full account access granted** 🎉

---

## Development vs Production Flow

### Development Flow (REQUIRE_EMAIL_VERIFICATION=false)

```
┌─────────────────────────────────────────────────────┐
│ User Signup                                         │
│ POST /api/auth/signup                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Account Created + Token Issued                      │
│ ✅ User can login with token                       │
│ ⏳ Email not yet verified                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Send Verification Email                            │
│ POST /api/auth/send-verification-email             │
│ Response: { otpCode: "123456" } ← Returned!       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Developer/Tester Uses OTP from Response             │
│ (No email check needed)                            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Verify Email with OTP                              │
│ POST /api/auth/verify-email { otpCode: "123456" } │
│ Auto-approves: ✅ Email verified                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Login Successful                                    │
│ POST /api/auth/login                               │
│ ✅ Full access granted                             │
└─────────────────────────────────────────────────────┘

⏱️ Total Time: 10-20 seconds
```

### Production Flow (REQUIRE_EMAIL_VERIFICATION=true)

```
┌─────────────────────────────────────────────────────┐
│ User Signup                                         │
│ POST /api/auth/signup                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Account Created + Token Issued                      │
│ ✅ User can login with token                       │
│ ⏳ Email not yet verified                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Send Verification Email                            │
│ POST /api/auth/send-verification-email             │
│ Response: { message: "Verification email sent" }  │
│ (OTP NOT returned - only emailed)                 │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Email Sent via Resend                              │
│ 📧 User receives email with OTP code              │
│ ⏱️ 5-minute expiration timer starts               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ User Opens Email                                    │
│ 📧 Reads 6-digit OTP code                         │
│ 👤 User copies code from email                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ User Enters OTP in App                             │
│ Submits verification form                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Verify Email with OTP                              │
│ POST /api/auth/verify-email { otpCode: "123456" } │
│ Server verifies: ✅ OTP valid                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Email Verified                                      │
│ ✅ User can now login                              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ User Login                                          │
│ POST /api/auth/login                               │
│ ✅ Full access granted                             │
└─────────────────────────────────────────────────────┘

⏱️ Total Time: 5-10 minutes (email time included)
```

---

## State Machine

### Email Verification States

```
┌─────────────────────────────────────────┐
│        SIGNUP_COMPLETE                  │
│   Email not yet verified (⏳)           │
│   User can login but with limited access
└────────────┬────────────────────────────┘
             │
             │ Call: send-verification-email
             ▼
┌─────────────────────────────────────────┐
│        OTP_SENT                         │
│   OTP code generated & hashed           │
│   Email sent via Resend                 │
│   5-minute expiration timer started     │
└────────────┬────────────────────────────┘
             │
             ├─────────────────────────────────────┐
             │                                     │
             │ Valid OTP within 5 min     │ Expired or wrong OTP
             ▼                                     ▼
    ┌──────────────────┐            ┌────────────────────────┐
    │ EMAIL_VERIFIED   │            │ Call: resend OR expire │
    │ ✅ Access OK    │            │ Back to OTP_SENT state │
    │ Can use all      │            │ Generate new OTP       │
    │ features         │            └────────────────────────┘
    └──────────────────┘
```

---

## API Integration Points

### Signup Response
The signup endpoint now creates an unverified account:
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "...",
  "note": "Email verification required for full access"
}
```

### Post-Signup Flow
1. User must call `/api/auth/send-verification-email`
2. User must verify with `/api/auth/verify-email`
3. Only then: Full feature access

### Protected Routes
Routes can check email verification status:
```typescript
// Check if email verified before allowing sensitive operations
const emailStatus = await getEmailVerificationStatus(email);
if (!emailStatus.verified && isEmailVerificationRequired()) {
  return { error: "Email verification required" };
}
```

---

## Logging Integration

### Signup Logging
```
[INFO] User signup attempt
[INFO] New user created
  { userId: '...', email: 'user@example.com', fullName: 'John Doe' }
```

### Email Verification Logging
```
[INFO] Email verification OTP request
[INFO] Sending verification email via Resend
[INFO] Verification email sent successfully
  { email: 'user@example.com', messageId: 're_msg_123' }
```

### Verification Logging
```
[INFO] Email verification attempt
[INFO] Email verified successfully
  { email: 'user@example.com' }
```

### Development Mode Logging
```
[WARN] Returning OTP in response - email verification disabled
[INFO] Email verification disabled - auto-approving
```

---

## Error Recovery

### Expired OTP (after 5 minutes)
```
POST /api/auth/resend-verification-email
{"email": "user@example.com"}
```
- New OTP generated
- Previous OTP invalidated
- Same rate limiting applies (3/hour)

### Max Attempts Exceeded
```
POST /api/auth/resend-verification-email
{"email": "user@example.com"}
```
- User must request new code
- Rate limit enforced (3/hour)
- Clear error message

### Email Not Received
```
POST /api/auth/resend-verification-email
{"email": "user@example.com"}
```
- Retry sending
- Check spam folder
- Verify email address

---

## Security Considerations

### OTP Security
- ✅ 6-digit codes (1M possible combinations)
- ✅ 5-minute expiration (time-based)
- ✅ 3-attempt limit (brute-force protection)
- ✅ Hashed storage (SHA-256, not plaintext)
- ✅ Constant-time comparison (timing attack protection)
- ✅ Rate limited (3 per hour per email)

### Email Security
- ✅ Resend HTTPS delivery
- ✅ No PII in logs (except email identifier)
- ✅ Code never stored in plaintext
- ✅ No code in response URLs
- ✅ HTML sanitized for security

### Account Security
- ✅ Password hashing (PBKDF2-SHA256)
- ✅ Email uniqueness enforcement
- ✅ Account lockout after failed attempts
- ✅ Session token expiration (30 days)
- ✅ Audit logging of all auth events

---

## Testing Scenarios

### Happy Path (Development)
```bash
1. POST /api/auth/signup
2. POST /api/auth/send-verification-email
3. Extract otpCode from response
4. POST /api/auth/verify-email with otpCode
5. POST /api/auth/login
✅ Success
```

### Wrong OTP
```bash
1. POST /api/auth/send-verification-email
2. POST /api/auth/verify-email with wrong code
❌ "Invalid verification code"
3. Try again (2 more attempts allowed)
```

### Expired OTP
```bash
1. POST /api/auth/send-verification-email
2. Wait 5+ minutes
3. POST /api/auth/verify-email
❌ "Verification code has expired"
4. POST /api/auth/resend-verification-email
5. Try new code
✅ Success
```

### Rate Limit
```bash
1. POST /api/auth/send-verification-email (success)
2. POST /api/auth/send-verification-email (success)
3. POST /api/auth/send-verification-email (success)
4. POST /api/auth/send-verification-email (wait 1 hour)
❌ "Too many verification requests"
```

---

## Summary

The email verification system provides:

✅ Secure OTP-based email verification
✅ Professional HTML email template
✅ 5-minute code expiration
✅ Rate limiting protection
✅ Development/production modes
✅ Comprehensive logging
✅ Error recovery options
✅ Integration with signup flow

**Production Ready: YES** ✅
