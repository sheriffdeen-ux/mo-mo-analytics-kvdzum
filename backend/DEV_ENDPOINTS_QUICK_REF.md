# Development Testing Endpoints - Quick Reference

## Quick Start (30 seconds)

### 1. Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "fullName": "Test User"
  }'
```

### 2. Mark Email Verified (Dev Only)
```bash
curl -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 4. Use App
```bash
# Use returned accessToken
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

✅ **Done! You're logged in and can test the app.**

---

## All Development Endpoints

### POST /api/auth/email/mark-verified
**Development/Testing Only**

Mark an email as verified without OTP.

```bash
curl -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Email marked as verified",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "emailVerified": true
  }
}
```

---

## Environment Setup

```bash
# Automatically enabled in development:
NODE_ENV=development

# Check server logs for:
⚠️ DEVELOPMENT TESTING MODE - Dev endpoints available
```

---

## Use Cases

| Scenario | Steps | Time |
|----------|-------|------|
| Test login flow | Signup → Mark verified → Login | 10 sec |
| Test homepage | Above + Access app | 15 sec |
| Test features | Above + Explore app | 30 sec |
| Email OTP test | Signup → Send email → Verify OTP | 5 min |

---

## Common Commands

### Signup & Test
```bash
#!/bin/bash

EMAIL="testuser@example.com"
PASSWORD="TestPassword123"
NAME="Test User"

# 1. Signup
SIGNUP=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"fullName\": \"$NAME\"
  }")

TOKEN=$(echo $SIGNUP | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Signed up! Token: $TOKEN"

# 2. Mark verified (dev)
curl -s -X POST http://localhost:3000/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}" | grep -q '"success":true'
echo "✅ Email verified!"

# 3. Login
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Logged in! Token: $TOKEN"

# 4. Test protected route
curl -s -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" | grep -q '"success":true'
echo "✅ App access working!"

echo ""
echo "🎉 Ready to test the app!"
```

---

## Status Check

```bash
# Check if dev testing is enabled
curl -s http://localhost:3000/api/auth/email/mark-verified \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# If you see:
# "This endpoint is only available in development mode"
# → NODE_ENV is not development, OR
# → Dev testing is disabled

# If successful:
# "Email marked as verified"
# → Dev mode is active ✅
```

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "This endpoint is only available..." | Set `NODE_ENV=development` |
| "User not found" | Sign up first before marking verified |
| "Email is required" | Add `email` field to request body |
| 404 Not found | Server not running or route not registered |

---

## Development Mode Check

```bash
# Server startup should show:
⚠️ DEVELOPMENT TESTING MODE - Dev endpoints available
{
  devTestingEnabled: true,
  nodeEnv: 'development'
}
```

If you don't see this, dev testing is disabled.

---

## Important Notes

⚠️ **Development Only** - These endpoints:
- ✅ Work in `NODE_ENV=development` or `NODE_ENV=test`
- ❌ Disabled in `NODE_ENV=production`
- ❌ Never use in production
- ⚠️ Bypass email verification
- ⚠️ Only for testing/development

---

## Next Steps

1. ✅ Sign up with email
2. ✅ Mark email verified (dev)
3. ✅ Login with credentials
4. ✅ Explore app features
5. ✅ Test integrations

**Total time: < 1 minute** ⏱️

---

**Ready to test? Let's go!** 🚀
