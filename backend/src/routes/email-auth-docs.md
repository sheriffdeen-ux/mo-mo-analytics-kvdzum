# Email Authentication API Documentation

This document describes the email-based authentication endpoints for user registration, login, and profile management.

## Overview

The email authentication system provides:
- **Email-based signup** with password
- **Email-based login** with password
- **Password management** (change password)
- **User profile management**
- **Device registration** on signup/login
- **14-day trial** automatically granted to new users

## Authentication Endpoints

### POST /api/auth/signup
Register a new user with email, password, and profile information.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "fullName": "John Doe",
  "phoneNumber": "+233201234567",
  "deviceId": "device-uuid-123"
}
```

**Request Fields**:
- `email` (required): User's email address
- `password` (required): Password (must meet strength requirements)
- `fullName` (required): User's full name
- `phoneNumber` (optional): User's phone number (stored as profile info only)
- `deviceId` (optional): Device identifier for push notifications

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

**Response** (Success):
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

**Response** (Error - Email Already Registered):
```json
{
  "success": false,
  "error": "Email already registered"
}
```

**Response** (Error - Weak Password):
```json
{
  "success": false,
  "error": "Password does not meet requirements",
  "errors": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter"
  ]
}
```

**Response** (Error - Invalid Email):
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "fullName": "John Doe",
    "phoneNumber": "+233201234567",
    "deviceId": "device-123"
  }'
```

**Success Details**:
- New user account created
- 14-day trial subscription automatically granted
- User settings table created with default values
- Device registered if deviceId provided
- 30-day authentication token generated

---

### POST /api/auth/login
Login with email and password.

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "deviceId": "device-uuid-123"
}
```

**Request Fields**:
- `email` (required): User's email address
- `password` (required): User's password
- `deviceId` (optional): Device identifier for push notifications

**Response** (Success):
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

**Response** (Error - Invalid Credentials):
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Response** (Error - Rate Limited):
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again in 15 minutes."
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "deviceId": "device-123"
  }'
```

**Key Features**:
- Rate limited (3 attempts per 15 minutes per email)
- Auto-downgrade trial to free tier if expired
- Device registration on login
- Last login timestamp updated
- 30-day authentication token generated

---

## Profile Management Endpoints

### GET /api/auth/profile
Get the authenticated user's profile.

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {accessToken}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abc123",
    "fullName": "John Doe",
    "email": "user@example.com",
    "phoneNumber": "+233201234567",
    "businessName": "Doe & Co",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-01-29T10:30:00.000Z",
    "lastLoginAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Example cURL**:
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### PUT /api/auth/profile
Update the authenticated user's profile.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "fullName": "Jane Doe",
  "phoneNumber": "+233209876543",
  "businessName": "Doe Enterprises"
}
```

**Request Fields** (all optional):
- `fullName`: Updated full name
- `phoneNumber`: Updated phone number (set to null/empty to remove)
- `businessName`: Business name (set to null/empty to remove)

**Response** (Success):
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

**Example cURL**:
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Doe",
    "phoneNumber": "+233209876543"
  }'
```

---

## Password Management

### POST /api/auth/change-password
Change the authenticated user's password.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Request Fields**:
- `currentPassword` (required): Current password (must be correct)
- `newPassword` (required): New password (must meet strength requirements)

**Response** (Success):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Response** (Error - Invalid Current Password):
```json
{
  "success": false,
  "error": "Invalid current password"
}
```

**Response** (Error - Weak New Password):
```json
{
  "success": false,
  "error": "New password does not meet requirements",
  "errors": [
    "Password must be at least 8 characters long"
  ]
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
  }'
```

**Key Features**:
- Verifies current password before allowing change
- Enforces password strength requirements
- Updates password hash and salt securely
- Logs password change event to audit log

---

### POST /api/auth/logout
Logout the current user.

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {accessToken}
```

**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Note**: Token is invalidated on client side. Clear the token from local storage/cookies after receiving this response.

---

## Request/Response Patterns

### Common Headers Required
```
Authorization: Bearer {accessToken}        // For protected routes
Content-Type: application/json             // For requests with body
```

### Common Error Responses
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

### Token Information
- **Type**: Bearer token (30 days)
- **Format**: HMAC-SHA256 signed JWT-like token
- **Expiration**: 2,592,000 seconds (30 days)
- **Usage**: Include in Authorization header: `Authorization: Bearer {token}`

---

## User Profile Fields

### Required Fields
- `id`: Unique user ID (generated on signup)
- `fullName`: User's full name (required at signup)
- `email`: User's email address (unique, required)
- `subscriptionStatus`: One of "free", "trial", "pro", "business" (default: "trial")

### Optional Profile Fields
- `phoneNumber`: User's phone number (stored as profile info only)
- `businessName`: Optional business name
- `trialEndDate`: When trial expires (auto-set to 14 days from signup)

---

## Authentication Flow

### Sign Up Flow
```
1. Client POST /api/auth/signup with email, password, fullName
2. Server validates inputs
3. Server hashes password with PBKDF2
4. Server creates user with 14-day trial
5. Server creates user settings
6. Server registers device (if deviceId provided)
7. Server generates 30-day access token
8. Server returns user data + token
9. Client stores token in localStorage/secure storage
```

### Login Flow
```
1. Client POST /api/auth/login with email, password
2. Server checks rate limit (3/15min)
3. Server finds user by email
4. Server verifies password against hash
5. Server checks if trial expired (auto-downgrade if needed)
6. Server registers device (if deviceId provided)
7. Server updates lastLoginAt timestamp
8. Server generates 30-day access token
9. Server returns user data + token
10. Client stores token for subsequent requests
```

### Protected Route Flow
```
1. Client includes Authorization: Bearer {token} header
2. Server validates token signature and expiration
3. Server extracts userId from token
4. Server verifies user exists
5. Server processes request
6. Server returns data/success response
```

---

## Password Hashing & Security

### PBKDF2-SHA256 Implementation
- **Algorithm**: PBKDF2
- **Hash Function**: SHA-256
- **Iterations**: 100,000
- **Key Length**: 64 bytes
- **Salt**: 32 bytes (random)

### Security Features
- Passwords never stored in plaintext
- Each password has unique salt
- 100,000 iterations prevent brute-force
- Constant-time comparison prevents timing attacks
- Password strength enforced at signup/change

---

## Rate Limiting

### Login Attempts
- **Limit**: 3 attempts per email per 15 minutes
- **Response**: 429 status with "Too many login attempts" error
- **Reset**: Automatic after 15 minutes

### Signup
- **Limit**: No limit (email uniqueness enforced)
- **Duplicate Email**: Returns error instead of allowing duplicate

---

## Email Validation

### Format Requirements
- Must contain @ symbol
- Must have domain after @
- Standard email format validation (RFC 5322 simplified)

### Case Sensitivity
- Emails are normalized to lowercase
- user@example.com == USER@EXAMPLE.COM

---

## Subscription Auto-Management

### New User Signup
- Automatically granted **14-day trial** subscription
- Trial ends 14 days from signup date
- subscriptionStatus = "trial"

### Trial Expiration
- On login/profile access, checks if trial expired
- If expired, auto-downgrade to "free" tier
- subscriptionStatus = "free"
- No manual intervention needed

### Free Tier Limits
- Basic fraud detection
- No advanced features
- Cannot upgrade within app (future API)

---

## Device Registration

### Automatic Registration
- First signup: Device registered if deviceId provided
- Each login: Device registered if deviceId provided
- Prevents duplicate device entries

### Device ID Purpose
- Used for push notifications (FCM)
- Used for device trust tracking
- Used for fraud detection patterns

---

## Logging & Audit

### Logged Events
- **SIGNUP**: User account created
- **LOGIN**: User logged in
- **LOGOUT**: User logged out
- **PASSWORD_CHANGE**: Password changed
- **PROFILE_UPDATE**: Profile information updated

### Log Includes
- Timestamp
- User ID
- Action
- IP address
- Device fingerprint (if available)
- Success/failure status

---

## Error Codes & Messages

### Authentication Errors
- `"Invalid email or password"` - Credentials don't match
- `"Email already registered"` - Email already has account
- `"Invalid email format"` - Email format invalid
- `"Invalid current password"` - Current password incorrect

### Validation Errors
- `"Full name is required"` - Missing name at signup
- `"Password does not meet requirements"` - Weak password
- `"User not found"` - User account not found

### Rate Limiting
- `"Too many login attempts. Please try again in 15 minutes."` - Login rate limit exceeded

---

## Testing Examples

### Sign Up New User
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "TestPassword123",
    "fullName": "Test User",
    "phoneNumber": "+233201234567",
    "deviceId": "device-001"
  }'
```

### Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "TestPassword123",
    "deviceId": "device-001"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name",
    "businessName": "My Business"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
  }'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Summary

The email authentication system provides:
- ✅ Secure email/password authentication
- ✅ Account creation with automatic 14-day trial
- ✅ Password management and change capability
- ✅ User profile management
- ✅ Device registration for notifications
- ✅ Rate limiting for login attempts
- ✅ Comprehensive audit logging
- ✅ Password strength enforcement
- ✅ Secure password hashing (PBKDF2-SHA256)
