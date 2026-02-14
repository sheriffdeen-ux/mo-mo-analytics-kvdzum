# Email Link Verification System

## Overview

The MoMo Analytics backend now includes a complete email link-based verification system. Users receive a verification link via email with a unique token that expires after 24 hours.

---

## Features

✅ **UUID-based Tokens** - Unique, secure verification tokens
✅ **24-Hour Expiry** - Tokens expire after 24 hours
✅ **Rate Limiting** - 3 verification emails per hour per email
✅ **Automatic Sending** - Verification email sent on signup
✅ **Professional Email Template** - Mobile-responsive HTML
✅ **Required Phone Number** - Phone is now required at signup
✅ **Database Tracking** - Token storage with expiry times
✅ **Resend Support** - Works with Resend email service
✅ **Error Handling** - Graceful failure with user-friendly messages
✅ **Logging** - Complete audit trail of verification events

---

## Database Schema Changes

### Updated `userExtended` Table

**New Fields:**
```sql
verificationToken TEXT NULLABLE        -- UUID token for email verification
verificationTokenExpiry TIMESTAMP      -- Token expiry (24 hours from generation)
phoneNumber TEXT NOT NULL             -- Now required (was optional)
emailVerified BOOLEAN DEFAULT false    -- Verification status (already existed)
```

**New Index:**
```sql
idx_user_extended_verification_token ON userExtended(verificationToken)
```

---

## API Endpoints

### 1. POST /api/auth/signup
Updated to require phone number and send verification email automatically.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe",
  "phoneNumber": "+233201234567",
  "deviceId": "device-123"
}
```

**Requirements:**
- Email: Valid email format
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit
- Full Name: Required
- **Phone Number: Required** (NEW)
- Device ID: Optional

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123...",
    "fullName": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+233201234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-01-29T10:30:00Z",
    "emailVerified": false
  },
  "accessToken": "...",
  "expiresIn": 2592000,
  "tokenType": "Bearer",
  "message": "Account created successfully. Please verify your email to unlock all features."
}
```

**What Happens:**
- User account created ✅
- 14-day trial granted ✅
- Verification token generated (UUID) ✅
- Verification link sent to email ✅
- User can login immediately (but emailVerified = false) ✅

---

### 2. POST /api/auth/send-verification-link
Send verification link to user's email.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/send-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification link has been sent to your email. Please check your inbox."
}
```

**Response (Already Verified):**
```json
{
  "success": true,
  "message": "This email is already verified."
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "error": "Too many verification emails sent. Please try again in 1 hour."
}
```

**Rate Limit:** 3 emails per hour per email address

---

### 3. GET /api/auth/verify-email-link
Verify email using token from verification link.

**Request:**
```bash
# User clicks link: {FRONTEND_URL}/verify-email?token={token}
# Frontend calls:
curl -X GET "http://localhost:3000/api/auth/verify-email-link?token=550e8400-e29b-41d4-a716-446655440000"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "emailVerified": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

**Response (Already Verified):**
```json
{
  "success": true,
  "message": "Email is already verified",
  "emailVerified": true
}
```

**Response (Invalid/Expired Token):**
```json
{
  "success": false,
  "error": "Invalid or expired verification token"
}
```

**Response (Expired Token):**
```json
{
  "success": false,
  "error": "Verification token has expired. Please request a new one."
}
```

**What Happens:**
- Token validated in database ✅
- Expiry checked (24 hours) ✅
- If valid: emailVerified = true ✅
- Token cleared from database ✅
- User data returned ✅

---

### 4. POST /api/auth/resend-verification-link
Resend verification link (generate new token).

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/resend-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Verification link has been sent to your email. Please check your inbox."
}
```

**Rate Limit:** 3 emails per hour per email address

**What Happens:**
- New token generated ✅
- Old token replaced ✅
- New email sent with new link ✅
- Rate limit checked ✅

---

## Email Template

### Subject
```
Verify your MoMo Analytics account
```

### Features
✅ Mobile-responsive design
✅ Professional branding with gradient header
✅ Prominent verification button
✅ 24-hour expiration notice
✅ Step-by-step instructions
✅ Alternative link (copy-paste)
✅ Help links to support page
✅ Privacy policy and terms links

### Content Highlights
- Personalized greeting with user's name
- Clear call-to-action button
- Expiration timer (24 hours)
- Instructions for manual link copying
- Support email option
- Footer with company info

---

## Environment Variables

### Required
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx    # Resend API key
```

### Optional
```bash
FRONTEND_URL=https://app.momo-analytics.app
SENDER_EMAIL=noreply@momo-analytics.app
SENDER_NAME=MoMo Analytics
REQUIRE_EMAIL_VERIFICATION=true    # Default: true
```

---

## Token Security

### Generation
- **Type**: UUID (universally unique identifier)
- **Length**: 36 characters (standard UUID format)
- **Randomness**: Cryptographically random
- **Storage**: Stored in database (never in logs)

### Storage
- **Hashing**: Not hashed (tokens are unique by design)
- **Lookup**: Indexed for fast verification
- **Clearing**: Deleted after successful verification or 24-hour expiry

### Expiry
- **Duration**: 24 hours from generation
- **Check**: On every verification attempt
- **Behavior**: Instant rejection if expired

---

## Security Features

### Rate Limiting
- **Limit**: 3 verification emails per hour per email
- **Purpose**: Prevent email spam/abuse
- **Implementation**: In-memory counter with hourly reset
- **Scope**: Per email address

### Token Validation
- **Format Check**: Token must exist in database
- **Expiry Check**: Must not be older than 24 hours
- **Match Check**: Must match user's stored token
- **One-time Use**: Cleared after verification

### Privacy
- **No PII in URLs**: Token is only identifier
- **No Email Leaking**: "Email not found" doesn't reveal existence
- **Secure Transmission**: Token in URL only (with HTTPS)
- **Limited Time**: 24-hour window for verification

---

## Complete Verification Flow

```
┌─────────────────────────────────────────┐
│ User Signup                             │
│ POST /api/auth/signup                  │
│ {email, password, fullName, phoneNumber}
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ Account Created                         │
│ - User account created                 │
│ - 14-day trial granted                 │
│ - Verification token generated (UUID)  │
│ - Verification email sent              │
│ - emailVerified = false                │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ Email Delivery                          │
│ Resend sends email with verification   │
│ link to user's inbox                   │
│                                         │
│ Link format:                            │
│ {FRONTEND_URL}/verify-email?token=...  │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ User Receives Email                     │
│ - User opens email in inbox             │
│ - Reads "Verify your MoMo Analytics     │
│   account" email                        │
│ - Sees prominent verification button   │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ User Clicks Link                        │
│ - User clicks verification button      │
│ - Browser navigates to verification    │
│   page with token in URL               │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ Frontend Calls Verification             │
│ GET /api/auth/verify-email-link        │
│ ?token=550e8400-e29b-41d4-a716-...    │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ Backend Validates Token                 │
│ - Find token in database               │
│ - Check if expired (24 hours)          │
│ - If valid: mark emailVerified = true  │
│ - Clear token from database            │
└──────────────────────┬──────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────┐
│ Email Verified!                         │
│ ✅ User has full app access            │
│ ✅ emailVerified = true                │
│ ✅ All features unlocked               │
└─────────────────────────────────────────┘
```

---

## User Journey Examples

### Example 1: Quick Signup & Verification

**Time: 2-3 minutes**

```bash
# 1. User signs up (10 sec)
POST /api/auth/signup
# Receives email immediately

# 2. User checks email (30 sec)
# Receives verification email in inbox

# 3. User clicks verification link (10 sec)
# Verification completes

# 4. User can now use app fully (instant)
GET /api/auth/verify-email-link?token=...
# emailVerified = true ✅
```

### Example 2: Resend Verification Link

**Scenario: User lost first email**

```bash
# 1. User didn't receive first email
# 2. User requests resend
POST /api/auth/resend-verification-link
{ "email": "user@example.com" }

# 3. New token generated, new email sent
# 4. User clicks new link
GET /api/auth/verify-email-link?token=...

# 5. Email verified ✅
```

### Example 3: Expired Token

**Scenario: User takes >24 hours to verify**

```bash
# 1. User received email day 1
# 2. User clicks link on day 2 (25 hours later)
GET /api/auth/verify-email-link?token=...

# Response: "Verification token has expired"

# 3. User requests resend
POST /api/auth/resend-verification-link

# 4. New token sent, user verifies same day ✅
```

---

## Logging

### Signup
```
[INFO] User signup attempt
{ email: 'user@example.com' }

[INFO] Sending verification link email via Resend
{ email: 'user@example.com', fullName: 'John Doe' }

[INFO] Verification link email sent successfully
{ email: 'user@example.com', messageId: 're_msg_123' }

[INFO] User signup successful
{ userId: 'user_...', email: 'user@example.com' }
```

### Verification
```
[INFO] Email verification link clicked
{ token: '550e8400' }  // First 8 chars only

[INFO] Email verified successfully via link
{ userId: 'user_...', email: 'user@example.com' }
```

### Error Cases
```
[WARN] Failed to send verification email, but user created successfully
{ email: 'user@example.com', error: 'RESEND_API_KEY not configured' }

[ERROR] Email verification failed
{ token: '550e8400', error: 'Invalid or expired token' }
```

---

## Testing

### Manual Testing

```bash
# 1. Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "fullName": "Test User",
    "phoneNumber": "+233201234567"
  }'

# 2. Check development logs for token or manually:
# In development, you can request resend to get details:
curl -X POST http://localhost:3000/api/auth/resend-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 3. Use development endpoint to mark verified:
curl -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 4. Or simulate link click by manually verifying with token:
curl -X GET "http://localhost:3000/api/auth/verify-email-link?token=550e8400-e29b-41d4-a716-446655440000"
```

### Development Mode

In development mode:
- Verification link can be sent to any email (Resend may be configured)
- Tokens can be accessed via logs
- Use development endpoints to bypass verification if needed
- Database directly shows tokens for inspection

---

## Configuration Examples

### Production
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
REQUIRE_EMAIL_VERIFICATION=true
FRONTEND_URL=https://app.momo-analytics.app
SENDER_EMAIL=noreply@momo-analytics.app
SENDER_NAME=MoMo Analytics
```

### Development
```bash
RESEND_API_KEY=re_test_xxxxxxxxxxxx
REQUIRE_EMAIL_VERIFICATION=true
FRONTEND_URL=http://localhost:3000
SENDER_EMAIL=noreply@localhost
SENDER_NAME=MoMo Analytics (Dev)
```

---

## Files Modified/Created

### New Files
1. **`src/utils/verification-token-service.ts`** - Token generation and management
2. **`src/routes/email-link-verification.ts`** - Verification endpoints
3. **`EMAIL_LINK_VERIFICATION.md`** - This documentation

### Modified Files
1. **`src/db/schema.ts`** - Added verification fields and phone number requirement
2. **`src/routes/email-auth.ts`** - Updated signup to include verification
3. **`src/utils/email-service.ts`** - Added verification link email template
4. **`src/index.ts`** - Registered email link verification routes

---

## Summary

The email link verification system provides:

✅ Secure UUID-based tokens
✅ 24-hour expiration with database tracking
✅ Rate limiting (3 emails/hour)
✅ Professional HTML emails via Resend
✅ Required phone number at signup
✅ Automatic verification email sending
✅ Full audit trail and logging
✅ User-friendly error messages
✅ Production-ready implementation

**Status: Production Ready** ✅
