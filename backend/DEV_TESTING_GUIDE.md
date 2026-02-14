# Development Testing Guide

## Overview

The MoMo Analytics backend includes special development/testing endpoints to streamline testing and development workflows. These endpoints allow you to bypass email verification and quickly test the application without waiting for email delivery.

---

## Enabling Development Testing

### Environment Setup

Development testing is automatically enabled in development environments:

```bash
# Automatically enabled when:
NODE_ENV=development
# OR
NODE_ENV=test

# Or explicitly enable:
ENABLE_DEV_TESTING=true
```

### Check Status

The server logs the development testing status on startup:

```
⚠️ DEVELOPMENT TESTING MODE - Dev endpoints available
```

or

```
🔒 Production mode - Dev endpoints disabled
```

---

## Development Testing Endpoints

### 1. Mark Email as Verified (Development Endpoint)

**POST /api/auth/email/mark-verified**

Instantly mark an email as verified without sending or verifying OTP. This endpoint is **development/testing only**.

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email marked as verified",
  "user": {
    "id": "user_1234567890_abc123",
    "email": "user@example.com",
    "fullName": "John Doe",
    "emailVerified": true
  }
}
```

**Response (Error - Not Enabled):**
```json
{
  "success": false,
  "error": "This endpoint is only available in development mode"
}
```

**Response (Error - User Not Found):**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Use Cases:**
- ✅ Mark a newly created user as verified
- ✅ Bypass email verification for testing
- ✅ Test app features without email setup
- ✅ Quickly iterate during development

---

## Testing Workflows

### Workflow 1: Quick Login Test (Development Mode)

```bash
# Step 1: Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "fullName": "Test User"
  }'

# Response includes: accessToken, user data

# Step 2: Send verification email (optional in dev mode)
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com"}'

# Response includes: otpCode (in development mode)

# Step 3: Mark email as verified (development only)
curl -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com"}'

# Step 4: Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }'

# Full access to app ✅
```

### Workflow 2: OTP Verification Testing

```bash
# Step 1: Sign up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "fullName": "Test User"
  }'

# Step 2: Send verification email
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email": "testuser@example.com"}'

# Response (development mode): { otpCode: "123456" }

# Step 3: Verify email with OTP
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otpCode": "123456"
  }'

# Email automatically marked as verified in dev mode ✅
# In production mode: Requires actual OTP from email

# Step 4: Login and test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }'
```

### Workflow 3: Frontend Integration Testing

**Frontend: Sign up form**
```typescript
// Send signup request
const signupResponse = await fetch('/api/auth/signup', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123',
    fullName: 'Test User'
  })
});

// User gets accessToken immediately
const { accessToken, user } = await signupResponse.json();
```

**Frontend: Development testing (optional)**
```typescript
// Development only: Mark email as verified
if (isDevelopment) {
  await fetch('/api/auth/email/mark-verified', {
    method: 'POST',
    body: JSON.stringify({
      email: 'user@example.com'
    })
  });
}
```

**Frontend: Login and access app**
```typescript
// Login with credentials
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123'
  })
});

// Get new token and user data
const { accessToken, user } = await loginResponse.json();

// Use token for subsequent requests
fetch('/api/some-protected-route', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## Environment Variables Reference

| Variable | Default | Purpose |
|----------|---------|---------|
| NODE_ENV | development | Controls dev endpoints availability |
| ENABLE_DEV_TESTING | false (dev=true) | Explicitly enable/disable dev endpoints |
| REQUIRE_EMAIL_VERIFICATION | true | Require email verification in production |

### Configuration Examples

**Development (automatic):**
```bash
NODE_ENV=development
# Dev endpoints automatically available
```

**Production (secure):**
```bash
NODE_ENV=production
# Dev endpoints disabled even if code exists
```

**Force Enable (risky - don't use in production):**
```bash
NODE_ENV=production
ENABLE_DEV_TESTING=true
# Dev endpoints enabled (security risk!)
```

---

## Database Changes

### New Field in `userExtended` Table

```sql
ALTER TABLE user_extended ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

**Purpose:** Track whether user's email has been verified

**Values:**
- `false` - Email not yet verified (default)
- `true` - Email verified via OTP or development endpoint

---

## Security Considerations

### Development Testing Safety

✅ **Safe for Development:**
- Endpoints only available in `NODE_ENV=development` or `NODE_ENV=test`
- Requires explicit `ENABLE_DEV_TESTING=true` in production
- Logged with clear warnings
- Only marks existing users as verified (no data creation)

⚠️ **Not for Production:**
- Never enable dev testing endpoints in production
- Dev endpoints bypass email verification
- Would allow unauthorized account access
- Should be disabled in production builds

### Best Practices

1. **Keep NODE_ENV Correct**
   - `development` for local development
   - `test` for CI/testing
   - `production` for deployed apps

2. **Don't Hardcode ENABLE_DEV_TESTING**
   - Let environment determine behavior
   - Never override in production

3. **Log Development Usage**
   - Dev endpoints log clearly with warnings
   - Monitor logs to detect misuse

4. **Database Verification**
   - `emailVerified` field tracks actual status
   - Can audit which emails were dev-marked

---

## Testing Scenarios

### Scenario 1: Quick Feature Testing

Time saved: **5 minutes per iteration** (no email wait)

```bash
1. Signup
2. Mark email verified (dev)
3. Login
4. Test feature
5. Repeat from step 1
```

### Scenario 2: Email Integration Testing

```bash
1. Signup
2. Send email (get OTP from response)
3. Verify with OTP
4. Check database emailVerified=true
5. Login and test
```

### Scenario 3: Error Handling Testing

```bash
1. Send email to non-existent user
2. Try wrong OTP (3x to hit limit)
3. Try expired OTP
4. Try rate limit (3x in 1 hour)
5. Verify error messages
```

### Scenario 4: Edge Cases

```bash
1. Mark already-verified user
2. Sign up with existing email
3. Verify without sending email
4. Login before verification
5. Resend OTP multiple times
```

---

## Logging

### Development Mode Logs

```
[INFO] ⚠️ DEVELOPMENT TESTING MODE - Dev endpoints available
{
  devTestingEnabled: true,
  nodeEnv: 'development'
}

[INFO] Development: Marking email as verified
{ email: 'user@example.com' }

[INFO] Email marked as verified (development mode)
{ email: 'user@example.com', userId: 'user_...' }
```

### Production Mode Logs

```
[INFO] 🔒 Production mode - Dev endpoints disabled
{
  devTestingEnabled: false,
  nodeEnv: 'production'
}

[INFO] POST /api/auth/email/mark-verified
[ERROR] This endpoint is only available in development mode
```

---

## Troubleshooting

### Issue: "This endpoint is only available in development mode"

**Cause:** `NODE_ENV` is not set to `development` or `test`

**Solution:**
```bash
# Set environment
NODE_ENV=development npm run dev

# Or check .env
cat .env | grep NODE_ENV
```

### Issue: "User not found"

**Cause:** User hasn't signed up yet

**Solution:**
```bash
# Sign up first
POST /api/auth/signup { email, password, fullName }

# Then mark verified
POST /api/auth/email/mark-verified { email }
```

### Issue: "Email is required"

**Cause:** Request body missing email field

**Solution:**
```bash
curl -X POST /api/auth/email/mark-verified \
  -d '{"email": "user@example.com"}'  # Add email field
```

---

## Files

### New/Modified Files

1. **`src/utils/dev-testing.ts`** (NEW)
   - Development testing utilities
   - Environment detection
   - Status logging

2. **`src/routes/email-verification.ts`** (MODIFIED)
   - Added `/api/auth/email/mark-verified` endpoint
   - Updated `/api/auth/verify-email` to mark user verified in database
   - Added dev testing imports

3. **`src/db/schema.ts`** (MODIFIED)
   - Added `emailVerified` field to `userExtended` table

4. **`DEV_TESTING_GUIDE.md`** (NEW)
   - This documentation file

---

## Summary

The development testing system provides:

✅ **Quick Testing** - Mark emails verified instantly
✅ **OTP Testing** - Verify OTP with returned codes
✅ **Safe by Default** - Only enabled in development
✅ **Auditable** - Logs all testing activities
✅ **Database Tracking** - Records actual verification status
✅ **Production Safe** - Completely disabled in production

**Perfect for:**
- Local development
- CI/CD testing
- Feature iteration
- Integration testing
- Rapid prototyping

**Status: Production Ready** ✅
