# Resend Email Verification Integration Guide

## Overview

The MoMo Analytics backend now integrates with **Resend** for sending professional email verification messages with 6-digit OTP codes. The system supports environment-based email confirmation control for development and production workflows.

---

## Features

✅ **Resend Integration** - Professional email delivery service
✅ **HTML Email Template** - Mobile-responsive, branded email design
✅ **OTP Code System** - 6-digit codes sent via email
✅ **Environment-Based Control** - Toggle verification on/off
✅ **Rate Limiting** - 3 verification requests per hour per email
✅ **Error Handling** - Graceful failure with user-friendly messages
✅ **Comprehensive Logging** - All email attempts logged
✅ **Development Mode** - OTP returned in response when verification disabled
✅ **Auto-Approval** - Automatic email verification in development

---

## Environment Variables

### Required

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```
Get your API key from https://resend.com/

### Optional

```bash
# Email sender configuration
SENDER_EMAIL=noreply@yourdomain.com
SENDER_NAME=MoMo Analytics

# Email verification requirement (default: true)
REQUIRE_EMAIL_VERIFICATION=true     # Production - require OTP verification
REQUIRE_EMAIL_VERIFICATION=false    # Development - auto-approve, return OTP in response
```

---

## Installation

The `resend` package has been installed:

```bash
npm list resend
# resend@6.9.2
```

---

## API Endpoints

### 1. Send Verification Email

**POST /api/auth/send-verification-email**

Send a verification email with OTP code to the user's email address.

**Request:**
```bash
POST /api/auth/send-verification-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (Production - REQUIRE_EMAIL_VERIFICATION=true):**
```json
{
  "success": true,
  "message": "Verification email sent"
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

**Error Response:**
```json
{
  "success": false,
  "error": "Too many verification requests. Please try again in 1 hour."
}
```

**Rate Limiting:** 3 requests per hour per email

---

### 2. Verify Email with OTP

**POST /api/auth/verify-email**

Verify the email address by submitting the OTP code.

**Request:**
```bash
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

**Response (Error - Invalid Code):**
```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

**Response (Error - Expired Code):**
```json
{
  "success": false,
  "error": "Verification code has expired"
}
```

**Response (Error - Max Attempts):**
```json
{
  "success": false,
  "error": "Maximum verification attempts exceeded. Request a new code."
}
```

**Behavior:**
- 3 maximum verification attempts per OTP
- Code expires after 5 minutes
- In development mode: auto-approves any code

---

### 3. Check Email Verification Status

**GET /api/auth/email-verification-status**

Check if an email address has been verified.

**Request:**
```bash
GET /api/auth/email-verification-status?email=user@example.com
```

**Response (Production - Verified):**
```json
{
  "success": true,
  "verified": true,
  "requiresVerification": true,
  "expiresAt": "2024-01-15T10:35:00.000Z"
}
```

**Response (Production - Not Verified):**
```json
{
  "success": true,
  "verified": false,
  "requiresVerification": true,
  "expiresAt": null
}
```

**Response (Development - Always Verified):**
```json
{
  "success": true,
  "verified": true,
  "requiresVerification": false
}
```

---

### 4. Resend Verification Email

**GET /api/auth/resend-verification-email**

Resend the verification email with a new OTP code.

**Request:**
```bash
GET /api/auth/resend-verification-email?email=user@example.com
```

**Response (Production):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

**Response (Development):**
```json
{
  "success": true,
  "message": "Verification email sent",
  "otpCode": "654321"
}
```

**Rate Limiting:** 3 requests per hour per email

---

## Email Template

### Design Features

✅ **Mobile-Responsive** - Works on all screen sizes
✅ **Professional Layout** - Branded header with gradient
✅ **Prominent OTP** - 32px bold code display
✅ **Clear Instructions** - 4-step verification process
✅ **Security Note** - Warning about code sharing
✅ **Expiration Timer** - Shows exact expiration time
✅ **Footer Links** - Privacy policy and terms
✅ **Dark Mode Support** - Readable in both themes

### Subject Line
```
Verify your email for MoMo Analytics
```

### Sender
```
MoMo Analytics <noreply@yourdomain.com>
```

### Email Content Highlights

**Header:**
- 🔐 "Verify Your Email" title
- Gradient background (purple/indigo)

**Body:**
- Personalized greeting with user name/email
- OTP code in large, monospace font
- 5-minute expiration warning
- Step-by-step verification instructions
- Security tips
- Links to help resources

**Footer:**
- Copyright notice
- Links to privacy policy and terms

---

## Configuration Examples

### Production Setup

```bash
# .env.production
RESEND_API_KEY=re_xxxxxxxxxxxx
SENDER_EMAIL=noreply@momo-analytics.app
SENDER_NAME=MoMo Analytics
REQUIRE_EMAIL_VERIFICATION=true
```

**Behavior:**
- OTP required for email verification
- No OTP in signup response
- Email must be verified before full account access
- Strict verification enforcement

### Development Setup

```bash
# .env.development
RESEND_API_KEY=re_xxxxxxxxxxxx
SENDER_EMAIL=noreply@momo-analytics.app
SENDER_NAME=MoMo Analytics
REQUIRE_EMAIL_VERIFICATION=false
```

**Behavior:**
- OTP returned in API response
- Auto-approval of email verification
- Users can log in immediately
- Perfect for testing and preview environments

### Local Testing (No Email Sending)

```bash
# .env.local
REQUIRE_EMAIL_VERIFICATION=false
# Without RESEND_API_KEY, emails won't send but OTP is returned for testing
```

---

## Usage Flow

### Development Flow (REQUIRE_EMAIL_VERIFICATION=false)

```
1. User signs up with email
2. POST /api/auth/send-verification-email
3. Response includes: { success: true, otpCode: "123456" }
4. Developer uses returned OTP
5. POST /api/auth/verify-email with OTP
6. Email auto-verified
7. User can log in immediately
8. Complete signup flow in seconds
```

### Production Flow (REQUIRE_EMAIL_VERIFICATION=true)

```
1. User signs up with email
2. POST /api/auth/send-verification-email
3. Response: { success: true, message: "Verification email sent" }
4. Email delivered by Resend with OTP code
5. User enters OTP from email
6. POST /api/auth/verify-email with OTP
7. Email verified
8. User can log in
9. Complete flow takes 5-10 minutes
```

---

## Logging & Debugging

### Console Output on Startup

**Production:**
```
[INFO] ✅ Email verification ENABLED - OTP verification required
{
  requireVerification: true,
  senderEmail: 'noreply@momo-analytics.app',
  resendConfigured: true
}
```

**Development:**
```
[INFO] ⚠️ Email verification DISABLED - auto-approving email without OTP verification
{
  requireVerification: false,
  senderEmail: 'noreply@momo-analytics.app',
  resendConfigured: true
}
```

### Email Sending Logs

**Success:**
```
[INFO] Sending verification email via Resend
{ email: 'user@example.com', fullName: 'John Doe' }

[INFO] Verification email sent successfully
{ email: 'user@example.com', messageId: 're_msg_abc123' }
```

**Failure:**
```
[ERROR] Failed to send verification email
{
  err: { message: 'Invalid API key' },
  email: 'user@example.com'
}

[ERROR] Error sending verification email
{
  err: Error: Failed to send email
  email: 'user@example.com'
}
```

**Development Mode:**
```
[WARN] Returning OTP in response - email verification disabled
{ email: 'user@example.com' }

[INFO] Email verification disabled - auto-approving
{ email: 'user@example.com' }
```

---

## Error Handling

### Resend API Errors

**Invalid API Key:**
```json
{
  "success": false,
  "error": "Email service error: Invalid API key"
}
```

**Rate Limited (Resend):**
```json
{
  "success": false,
  "error": "Email service error: Too many requests"
}
```

**Email Sending Failed:**
```json
{
  "success": false,
  "error": "Failed to send email: Connection timeout"
}
```

**Expired Verification Code:**
```json
{
  "success": false,
  "error": "Verification code has expired"
}
```

**Invalid OTP Code:**
```json
{
  "success": false,
  "error": "Invalid verification code"
}
```

**Max Attempts Exceeded:**
```json
{
  "success": false,
  "error": "Maximum verification attempts exceeded. Request a new code."
}
```

---

## Security Features

### Password-Style Hashing
- OTP codes are hashed with SHA-256
- Hashes stored in memory (not plaintext)
- Verification uses constant-time comparison

### Rate Limiting
- **Email OTP Requests:** 3 per hour per email
- **Verification Attempts:** 3 per OTP code
- **Code Expiration:** 5 minutes

### Email Validation
- Standard email format validation
- Domain verification via Resend
- No PII in logs (only email identifier)

### Development/Production Separation
- No cross-environment leakage
- Different security policies per environment
- Clear logging of mode active

---

## Testing Examples

### cURL Commands

**Send Verification Email:**
```bash
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**With Response OTP (Development):**
```json
{
  "success": true,
  "message": "Verification email sent",
  "otpCode": "123456"
}
```

**Verify Email:**
```bash
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otpCode": "123456"}'
```

**Check Status:**
```bash
curl -X GET http://localhost:3000/api/auth/email-verification-status?email=user@example.com
```

**Resend Verification:**
```bash
curl -X GET http://localhost:3000/api/auth/resend-verification-email?email=user@example.com
```

---

## Resend Account Setup

### Getting Started

1. **Create Account** - https://resend.com/register
2. **Get API Key** - Dashboard → API Keys
3. **Verify Domain** (Optional)
   - For custom domain: add DNS records
   - Default: `no-reply@resend.dev` available
4. **Add to Environment** - Set `RESEND_API_KEY`

### Free Tier Limits

- 100 emails per day
- Sandboxed domain (`@resend.dev`)
- Perfect for development/testing

### Production Tier

- Custom domain support
- Higher sending limits
- Email analytics
- Bounce handling

---

## Debugging Resend Issues

### Issue: "RESEND_API_KEY not configured"

**Solution:** Add to `.env` file:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Issue: "Email service error: Invalid API key"

**Solution:**
- Verify API key is correct (copy from Resend dashboard)
- Check no extra spaces or quotes
- Regenerate key if needed

### Issue: "Email service error: Invalid sender email"

**Solution:**
- Use format: `name <email@domain>`
- Verify domain is configured in Resend
- Use default `@resend.dev` for testing

### Issue: Emails not received

**Solution:**
- Check spam folder
- Verify email address is correct
- Check Resend logs for bounce
- Test with different email provider

---

## Integration with Signup Flow

The email verification integrates with the existing signup process:

```typescript
// 1. User signs up
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe"
}

// 2. Account created, but email not yet verified
// 3. Send verification email
POST /api/auth/send-verification-email
{
  "email": "user@example.com"
}

// 4. User verifies email
POST /api/auth/verify-email
{
  "email": "user@example.com",
  "otpCode": "123456"
}

// 5. Email verified, full access granted
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

---

## Files Modified/Created

### New Files
1. `src/utils/email-service.ts` - Resend integration and configuration
2. `src/routes/email-verification.ts` - Email verification endpoints
3. `RESEND_EMAIL_VERIFICATION.md` - This documentation

### Modified Files
1. `src/index.ts` - Registered email verification routes
2. `package.json` - Added resend dependency

---

## Environment Variable Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| RESEND_API_KEY | (required) | Resend API authentication key |
| REQUIRE_EMAIL_VERIFICATION | true | Enable/disable email verification |
| SENDER_EMAIL | noreply@momo-analytics.app | From email address |
| SENDER_NAME | MoMo Analytics | Sender display name |

---

## Production Checklist

- [ ] Set `REQUIRE_EMAIL_VERIFICATION=true`
- [ ] Configure custom `SENDER_EMAIL` domain
- [ ] Obtain `RESEND_API_KEY` from production account
- [ ] Test full signup → verification → login flow
- [ ] Monitor email delivery in Resend dashboard
- [ ] Set up bounce handling (if available)
- [ ] Test error cases (wrong OTP, expired code, etc.)
- [ ] Verify spam folder (Gmail, Outlook, etc.)
- [ ] Monitor application logs for email errors
- [ ] Set up alerts for high failure rates

---

## Development Checklist

- [ ] Install resend package (done)
- [ ] Set `REQUIRE_EMAIL_VERIFICATION=false`
- [ ] Keep RESEND_API_KEY (can be development key)
- [ ] Test OTP in API response
- [ ] Test auto-approval of verification
- [ ] Test rate limiting
- [ ] Verify email template rendering
- [ ] Test resend functionality
- [ ] Check console logging messages

---

## Support & Resources

- **Resend Docs:** https://resend.com/docs
- **Resend Status:** https://resend.com/status
- **API Reference:** https://resend.com/api-reference
- **Email Templates:** https://resend.com/templates
- **Contact:** support@resend.com

---

## Summary

The Resend email verification system provides:

✅ Professional email delivery
✅ HTML email templates
✅ OTP-based verification
✅ Environment-based configuration
✅ Rate limiting
✅ Error handling
✅ Development/production flexibility
✅ Comprehensive logging

**Status: Production Ready** ✅
