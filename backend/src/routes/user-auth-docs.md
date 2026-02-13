# User Authentication & Profile API Documentation

## Overview
MoMo Analytics provides phone-based authentication with JWT-like tokens valid for 30 days, plus user profile endpoints for retrieving authenticated user information.

## Authentication Flow

### 1. Send OTP - `POST /api/phone/send-otp`
Request OTP code via SMS to Ghana phone number.

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "expiresIn": 600
}
```

---

### 2. Verify OTP - `POST /api/phone/verify-otp`
Verify OTP code and authenticate user. Returns access token valid for 30 days.

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX",
  "otpCode": "123456",
  "fullName": "John Doe",
  "deviceId": "device_uuid_or_identifier"
}
```

**Response - Success (NEW USER):**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abcdef",
    "fullName": "John Doe",
    "phoneNumber": "+233XXXXXXXXX",
    "email": "+233XXXXXXXXX",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-01T00:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

**Response - Success (EXISTING USER):**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abcdef",
    "fullName": "John Doe",
    "phoneNumber": "+233XXXXXXXXX",
    "email": "+233XXXXXXXXX",
    "subscriptionStatus": "pro",
    "trialEndDate": null,
    "currentPlanId": "pro_monthly"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

**Response - Failure:**
```json
{
  "success": false,
  "error": "Invalid OTP code"
}
```

**Token Details:**
- **Type:** Bearer token (HMAC-SHA256 signed)
- **Expiration:** 30 days (2,592,000 seconds)
- **Payload:** userId, phoneNumber, createdAt, expiresAt
- **Format:** Base64-encoded JSON with HMAC signature
- **Storage:** Save accessToken in localStorage/secure storage on client
- **Usage:** Include in Authorization header: `Authorization: Bearer {accessToken}`

---

### 3. Resend OTP - `POST /api/phone/resend-otp`
Resend OTP code if user didn't receive the first one.

**Request:**
```json
{
  "phoneNumber": "+233XXXXXXXXX"
}
```

**Response:**
```json
{
  "success": true,
  "expiresIn": 600
}
```

---

## User Profile Endpoints (Protected)

### 4. Get Current User - `GET /api/user/me`
Fetch currently authenticated user's profile information.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response - Success:**
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abcdef",
    "fullName": "John Doe",
    "phoneNumber": "+233XXXXXXXXX",
    "email": "+233XXXXXXXXX",
    "subscriptionStatus": "pro",
    "trialEndDate": null,
    "currentPlanId": "pro_monthly"
  }
}
```

**Response - Unauthorized (No Token):**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid authorization"
}
```

**Response - Unauthorized (Invalid/Expired Token):**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token verification failed"
}
```

**Response - Not Found:**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### 5. Get User Profile - `GET /api/user/profile`
Alias for `/api/user/me`. Returns user profile without wrapping in success/user fields.

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "id": "user_1234567890_abcdef",
  "fullName": "John Doe",
  "phoneNumber": "+233XXXXXXXXX",
  "email": "+233XXXXXXXXX",
  "subscriptionStatus": "pro",
  "trialEndDate": null,
  "currentPlanId": "pro_monthly"
}
```

---

## Token Management

### Token Structure
Tokens are generated with HMAC-SHA256 signature containing:
```json
{
  "userId": "user_...",
  "phoneNumber": "+233XXXXXXXXX",
  "createdAt": 1704067200000,
  "expiresAt": 1706745600000
}
```

### Token Validation
- Tokens are verified on every protected endpoint request
- Invalid signature: 401 Unauthorized
- Expired token: 401 Unauthorized
- Missing token: 401 Unauthorized

### Client-Side Token Handling

**After OTP Verification:**
```javascript
// Save token
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('user', JSON.stringify(response.user));
localStorage.setItem('tokenExpires', Date.now() + response.expiresIn * 1000);
```

**Before API Requests:**
```javascript
const token = localStorage.getItem('accessToken');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

**On App Load:**
```javascript
// Fetch user profile to verify token validity
async function initializeUser() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  const response = await fetch('/api/user/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    return response.json();
  } else {
    // Token expired or invalid, redirect to login
    localStorage.clear();
    return null;
  }
}
```

---

## Error Codes & Handling

### Authentication Errors

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| 401 | Unauthorized | Missing or invalid token | Re-authenticate with OTP |
| 401 | Unauthorized | Token expired | Refresh with new OTP login |
| 404 | Not Found | User profile not found | Create new user account |
| 400 | Bad Request | Invalid phone format | Validate phone number |
| 400 | Bad Request | OTP expired | Request new OTP |
| 400 | Bad Request | OTP invalid | Request new OTP |
| 429 | Too Many Requests | Rate limit exceeded | Wait 1 hour before retrying |

### Rate Limiting
- **OTP Requests:** 3 per phone number per hour
- **API Requests:** 100 per IP per minute (general)
- **Payment Endpoints:** 10 per user per minute

---

## User Object Fields

```typescript
interface User {
  id: string;                          // Unique user ID
  fullName: string;                    // User's full name
  phoneNumber: string;                 // Ghana phone number (+233...)
  email: string;                       // Email (same as phone for now)
  subscriptionStatus: 'free' | 'trial' | 'pro' | 'business'; // Current plan
  trialEndDate?: Date;                // When trial expires (null if not in trial)
  currentPlanId?: string;              // Current subscription plan ID
}
```

---

## Subscription Status

| Status | Duration | Features | Auto-Downgrade |
|--------|----------|----------|-----------------|
| `trial` | 14 days | All Pro features | Yes, to `free` |
| `free` | Unlimited | Basic features | No |
| `pro` | Based on plan | Full 7-layer fraud detection | No |
| `business` | Based on plan | All Pro + multi-device | No |

---

## Testing Examples

### Test OTP Flow:
```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233201234567"}'

# 2. Verify OTP (use actual OTP received via SMS)
curl -X POST http://localhost:3000/api/phone/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+233201234567",
    "otpCode": "123456",
    "fullName": "John Doe",
    "deviceId": "device_123"
  }'

# 3. Fetch User Profile (use accessToken from response)
curl -X GET http://localhost:3000/api/user/me \
  -H "Authorization: Bearer {accessToken}"
```

---

## Implementation Notes

1. **Token Storage:** Tokens should be stored securely (localStorage for web, secure storage on mobile)
2. **Token Refresh:** Token lasts 30 days. After expiration, user must re-authenticate with OTP
3. **Silent Login:** Check token validity on app load to determine if user is authenticated
4. **Session Timeout:** Consider additional client-side session timeout (e.g., 1 hour of inactivity)
5. **Multi-Device:** Each device can have its own token; tokens are device-independent

---

## Security Considerations

1. **Token in Headers:** Always send token in `Authorization: Bearer` header, not in URL
2. **HTTPS Only:** Tokens should only be transmitted over HTTPS
3. **Token Storage:** Use secure storage (not localStorage for sensitive apps)
4. **Token Rotation:** Consider rotating tokens on each request for enhanced security
5. **CORS:** Ensure CORS is properly configured for your frontend domain
