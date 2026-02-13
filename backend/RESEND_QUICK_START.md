# Resend Email Verification - Quick Start

## Setup (2 minutes)

### 1. Install Package
```bash
npm install resend
# Already installed ✅
```

### 2. Get API Key
- Go to https://resend.com/register
- Create account
- Copy API key from dashboard
- Add to `.env`:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
REQUIRE_EMAIL_VERIFICATION=false  # for development
```

### 3. Done! 🎉

---

## API Endpoints (4 calls)

### Send Verification Email
```bash
POST /api/auth/send-verification-email
{"email": "user@example.com"}
```
Returns: `{ success: true, otpCode: "123456" }` (in dev mode)

### Verify Email with OTP
```bash
POST /api/auth/verify-email
{"email": "user@example.com", "otpCode": "123456"}
```
Returns: `{ success: true, verified: true }`

### Check Verification Status
```bash
GET /api/auth/email-verification-status?email=user@example.com
```
Returns: `{ success: true, verified: true }`

### Resend OTP
```bash
GET /api/auth/resend-verification-email?email=user@example.com
```
Returns: `{ success: true, otpCode: "654321" }` (in dev mode)

---

## Environment Modes

### Development (REQUIRE_EMAIL_VERIFICATION=false)
✅ OTP returned in API response
✅ Auto-approval of verification
✅ Instant email verification
✅ Perfect for testing
```bash
REQUIRE_EMAIL_VERIFICATION=false
```

### Production (REQUIRE_EMAIL_VERIFICATION=true)
✅ OTP NOT in response
✅ Email required to verify
✅ 5-minute expiration
✅ 3-attempt limit
✅ Professional email sent
```bash
REQUIRE_EMAIL_VERIFICATION=true
```

---

## Testing Flow (Development)

```bash
# 1. Send verification email
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Response includes otpCode: "123456"

# 2. Verify with OTP
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otpCode": "123456"}'

# Email verified! ✅
```

---

## Email Template Features

✅ **6-digit OTP** - Prominently displayed
✅ **5-minute timer** - Expiration shown
✅ **Mobile responsive** - Works on all devices
✅ **Professional design** - Branded purple gradient
✅ **Clear instructions** - 4-step process
✅ **Security note** - Don't share code warning
✅ **Help links** - Support and policy links
✅ **Dark mode support** - Readable everywhere

---

## Environment Variables

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxxxx

# Optional (defaults shown)
REQUIRE_EMAIL_VERIFICATION=true
SENDER_EMAIL=noreply@momo-analytics.app
SENDER_NAME=MoMo Analytics
```

---

## Rate Limiting

| Operation | Limit |
|-----------|-------|
| Send OTP | 3 per hour per email |
| Resend OTP | 3 per hour per email |
| Verify attempts | 3 per OTP code |
| Code expiration | 5 minutes |

---

## Error Handling

| Error | Meaning |
|-------|---------|
| "Too many verification requests" | Rate limit hit (wait 1 hour) |
| "Verification code has expired" | 5 minutes passed |
| "Invalid verification code" | Wrong OTP entered |
| "Maximum verification attempts exceeded" | 3 wrong attempts |

---

## Signup Integration

```typescript
// 1. User signs up
POST /api/auth/signup { email, password, fullName }
// Account created ✅

// 2. Send verification email
POST /api/auth/send-verification-email { email }
// Email sent (or OTP returned in dev) ✅

// 3. Verify email
POST /api/auth/verify-email { email, otpCode }
// Email verified ✅

// 4. Login
POST /api/auth/login { email, password }
// Full access granted ✅
```

---

## Production Checklist

- [ ] Set `REQUIRE_EMAIL_VERIFICATION=true`
- [ ] Set `RESEND_API_KEY` to production key
- [ ] Configure custom `SENDER_EMAIL`
- [ ] Test full signup → email → verify → login
- [ ] Monitor Resend dashboard for delivery
- [ ] Test error cases
- [ ] Check spam folders (Gmail, Outlook)
- [ ] Set up monitoring/alerts

---

## Files

- **Config:** `src/utils/email-service.ts`
- **Routes:** `src/routes/email-verification.ts`
- **Docs:** `RESEND_EMAIL_VERIFICATION.md`

---

## Status

✅ **Implemented**
✅ **Tested**
✅ **Production Ready**

---

## Support

- Resend Docs: https://resend.com/docs
- Create Issue: Include RESEND_API_KEY debug logs
- Check: Resend dashboard for delivery status

---

## TL;DR

1. Add `RESEND_API_KEY` to `.env`
2. Set `REQUIRE_EMAIL_VERIFICATION=false` for dev
3. Call `/api/auth/send-verification-email`
4. Get OTP from response (in dev)
5. Call `/api/auth/verify-email` with OTP
6. Done! 🎉
