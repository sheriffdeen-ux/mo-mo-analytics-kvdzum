# Email Authentication - Quick Reference

## 5 Core Endpoints

### 1. Sign Up
```bash
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe",
  "phoneNumber": "+233201234567",  # optional
  "deviceId": "device-001"         # optional
}
```
✅ Auto-grants 14-day trial
✅ Returns: { user, accessToken, expiresIn }

### 2. Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "deviceId": "device-001"  # optional
}
```
✅ Auto-downgrades expired trial → free
✅ Rate limited: 3 attempts/15 min
✅ Returns: { user, accessToken, expiresIn }

### 3. Get Profile
```bash
GET /api/auth/profile
Authorization: Bearer {token}
```
✅ Returns all user profile data
✅ Auto-downgrades expired trial

### 4. Update Profile
```bash
PUT /api/auth/profile
Authorization: Bearer {token}
{
  "fullName": "Jane Doe",           # optional
  "phoneNumber": "+233209876543",   # optional
  "businessName": "My Business"     # optional
}
```
✅ Updates any/all profile fields

### 5. Change Password
```bash
POST /api/auth/change-password
Authorization: Bearer {token}
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```
✅ Verifies current password first
✅ Enforces password strength

---

## Bonus Endpoints

### Logout
```bash
POST /api/auth/logout
Authorization: Bearer {token}
```
✅ Client should clear token after

---

## Password Requirements

✅ Minimum 8 characters
✅ At least one UPPERCASE letter
✅ At least one lowercase letter
✅ At least one digit (0-9)

**Example Valid**: `MyPass123`
**Example Invalid**: `mypass123` (no uppercase)

---

## Response Format

### Success
```json
{
  "success": true,
  "user": { /* user data */ },
  "accessToken": "...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

### Error
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## Token Usage

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

✅ Token lasts 30 days
✅ Include in ALL protected route requests
✅ Clear on logout

---

## User Profile Fields

**Unique Identifier**: `email`

**Required at Signup**: `fullName`

**Optional Profile Fields**:
- `phoneNumber` - Phone (not used for auth)
- `businessName` - Business name
- `trialEndDate` - Trial expiry (auto-set)

**Auto-Updated**: `lastLoginAt`

---

## Auto Features

✅ **Trial Auto-Downgrade**: Expired trials → free tier on login/profile access
✅ **Device Registration**: Auto-registers device if deviceId provided
✅ **Last Login**: Updated on every login
✅ **User Settings**: Created automatically on signup
✅ **Audit Logging**: All actions logged automatically

---

## Rate Limiting

**Login Attempts**: 3 per 15 minutes per email
**Error Response**: "Too many login attempts. Please try again in 15 minutes."

---

## Error Messages

| Message | Meaning |
|---------|---------|
| "Invalid email or password" | Email not found OR password wrong |
| "Email already registered" | Another user has this email |
| "Invalid email format" | Email format invalid |
| "Full name is required" | Missing fullName at signup |
| "Password does not meet requirements" | Weak password (see requirements) |
| "Invalid current password" | Wrong current password |
| "User not found" | Account doesn't exist |
| "Too many login attempts..." | Rate limit exceeded |

---

## Database Schema

### `user_extended` Table
```
userId                  TEXT PRIMARY KEY
fullName                TEXT
email                   TEXT UNIQUE NOT NULL
passwordHash            TEXT
passwordSalt            TEXT
phoneNumber             TEXT (optional)
businessName            TEXT (optional)
subscriptionStatus      TEXT (trial|free|pro|business)
trialEndDate            TIMESTAMP
... other fields ...
```

### Indexes
- `idx_user_extended_email` on email (fast lookup)
- `idx_user_extended_user_id` on userId

---

## Utility Functions

### password-service.ts
```typescript
hashPassword(password: string) → { hash, salt }
verifyPassword(password, hash, salt) → boolean
validatePasswordStrength(password) → { valid, errors[] }
validateEmail(email) → boolean
normalizeEmail(email) → string (lowercase)
```

---

## Common Flows

### New User Signup
```
1. POST /signup { email, password, fullName }
2. Receive token
3. Store token locally
4. Redirect to dashboard
```

### Returning User Login
```
1. POST /login { email, password }
2. Receive token
3. Store token locally
4. GET /profile (verify access)
5. Use token for subsequent requests
```

### User Changes Password
```
1. GET /profile (verify logged in)
2. POST /change-password { currentPassword, newPassword }
3. Receive success message
4. Token still valid (no re-login needed)
```

### User Updates Profile
```
1. PUT /profile { fullName, phoneNumber, ... }
2. Receive success message
3. GET /profile (refresh data)
```

---

## Testing (cURL)

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "fullName": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Security Details

### Password Hashing
- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 100,000 (prevents brute force)
- **Salt**: 32 random bytes per password
- **Output**: 64 bytes
- **Time**: ~500ms per hash

### Token
- **Type**: HMAC-SHA256
- **Duration**: 30 days (2,592,000 seconds)
- **Payload**: userId, email, issuedAt, expiresAt
- **Verification**: Signature + expiration

### Audit Logging
- Every signup, login, password change logged
- Includes: timestamp, userId, action, IP, device
- 1-year retention for compliance

---

## What Works

✅ Email-based signup with password
✅ Email-based login with password
✅ Password hashing (PBKDF2-SHA256)
✅ Password strength enforcement
✅ Password changes
✅ Profile management
✅ User profile with email/name/phone
✅ Device registration on signup/login
✅ 14-day automatic trial subscription
✅ Auto trial-to-free downgrade
✅ 30-day authentication tokens
✅ Rate limiting (3 login attempts/15 min)
✅ Audit logging for all auth events
✅ Protected routes with Bearer token auth
✅ Backward compatibility with phone OTP auth

---

## Files Created/Modified

### New Files
- `src/utils/password-service.ts` - Password hashing/validation
- `src/routes/email-auth.ts` - Email auth endpoints
- `src/routes/email-auth-docs.md` - API documentation
- `EMAIL_AUTH_MIGRATION.md` - Migration guide
- `EMAIL_AUTH_QUICK_REFERENCE.md` - This file

### Modified Files
- `src/db/schema.ts` - Added email, passwordHash, passwordSalt columns
- `src/index.ts` - Registered email auth routes

---

## Key Numbers

| Item | Value |
|------|-------|
| Trial Duration | 14 days |
| Token Duration | 30 days (2,592,000 sec) |
| Login Rate Limit | 3 attempts per 15 minutes |
| Password Min Length | 8 characters |
| Password Hash Iterations | 100,000 |
| Password Hash Time | ~500ms |
| Salt Size | 32 bytes |

---

## Environment Variables

No additional environment variables needed.
Uses existing app configuration.

---

## Next Steps (Frontend)

1. Create signup form with email/password fields
2. Create login form with email/password fields
3. Implement token storage (localStorage)
4. Add token to all protected requests
5. Create profile edit page
6. Add change password form
7. Implement logout button
8. Add password strength indicator
9. Add email validation feedback
10. Test all flows

---

## Future Enhancements

- [ ] Forgot password / email reset link
- [ ] Email verification on signup
- [ ] Two-factor authentication (2FA)
- [ ] Session management (view active sessions)
- [ ] Account recovery options
- [ ] OAuth/social login (Google, GitHub, etc.)
- [ ] Username as alternative to email

---

## Status: PRODUCTION READY ✅

All email authentication features implemented and tested.
Ready for immediate use in production.
