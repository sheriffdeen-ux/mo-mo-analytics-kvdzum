
# 🚀 Quick Start: Email Authentication Testing

## 📋 Overview

This guide helps you test the email authentication flow once the backend is implemented.

---

## ⚡ Quick Test (5 Minutes)

### 1. Start the App
```bash
npm start
```

### 2. Open on Device/Simulator
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for physical device

### 3. Sign Up
1. **Email**: `test@example.com`
2. **Full Name**: `John Doe`
3. **Phone**: `+233241234567` (optional)
4. Click **"Send OTP"**

### 4. Verify OTP
1. Check your email (or console logs if using console logging)
2. Enter the **6-digit OTP code**
3. Click **"Verify OTP"**

### 5. Expected Result
✅ You should be logged in and see the Transactions screen

---

## 🧪 Detailed Testing

### Test 1: Sign Up Flow
**Steps**:
1. Open app → Auth screen appears
2. Enter email, full name, phone (optional)
3. Click "Send OTP"
4. Check email for OTP code
5. Enter OTP code
6. Click "Verify OTP"

**Expected**:
- ✅ OTP sent successfully
- ✅ User logged in
- ✅ Redirected to Transactions screen
- ✅ New account created with 14-day trial

**Console Logs**:
```
[Auth] Sending OTP to: test@example.com
[API] POST /api/auth/email/send-otp
[API] Success response: { success: true, expiresIn: 600 }
[Auth] OTP sent successfully

[Auth] Verifying OTP for: test@example.com
[API] POST /api/auth/email/verify-otp
[API] Success response: { success: true, user: {...}, accessToken: "..." }
[Auth] Access token stored successfully
```

---

### Test 2: Resend OTP
**Steps**:
1. On OTP screen, wait for countdown to finish (60 seconds)
2. Click "Resend OTP"
3. Check email for new OTP code

**Expected**:
- ✅ New OTP sent
- ✅ Countdown resets to 60 seconds
- ✅ Success message appears

---

### Test 3: Invalid OTP
**Steps**:
1. Enter wrong OTP code (e.g., "000000")
2. Click "Verify OTP"

**Expected**:
- ❌ Error message: "Invalid OTP code"
- ✅ OTP input cleared
- ✅ Can try again (max 3 attempts)

---

### Test 4: Expired OTP
**Steps**:
1. Request OTP
2. Wait 11 minutes (OTP expires after 10 minutes)
3. Try to verify OTP

**Expected**:
- ❌ Error message: "OTP has expired"
- ✅ Can request new OTP

---

### Test 5: Session Persistence
**Steps**:
1. Log in successfully
2. Close app completely (swipe away from recent apps)
3. Reopen app

**Expected**:
- ✅ User remains logged in
- ✅ No redirect to auth screen
- ✅ Transactions screen loads immediately

**Console Logs**:
```
[Auth] Found bearer token, attempting to fetch user
[API] GET /api/user/me
[API] Success response: { id: "...", fullName: "...", email: "..." }
[Auth] User fetched successfully via bearer token
```

---

### Test 6: Sign Out
**Steps**:
1. Navigate to Profile tab
2. Click "Sign Out"
3. Confirm in modal

**Expected**:
- ✅ User logged out
- ✅ Redirected to auth screen
- ✅ Token cleared from storage

**Console Logs**:
```
[Profile] User signed out successfully
[Auth] No valid session found, user is not authenticated
```

---

### Test 7: Sign In Again
**Steps**:
1. Enter same email as before
2. Request OTP
3. Verify OTP

**Expected**:
- ✅ User logged in
- ✅ Previous account data loaded
- ✅ Subscription status preserved
- ✅ Settings preserved

---

### Test 8: Protected Endpoints
**Steps**:
1. Log in successfully
2. Navigate to Transactions tab
3. Pull to refresh

**Expected**:
- ✅ Transactions load
- ✅ Summary cards show data
- ✅ No 401 Unauthorized errors

**Console Logs**:
```
[API] GET /api/transactions
[API] Added Authorization header with bearer token
[API] Success response: { transactions: [...] }
```

---

### Test 9: Rate Limiting
**Steps**:
1. Request OTP
2. Immediately request OTP again
3. Repeat 3 times within 1 hour

**Expected**:
- ✅ First 3 requests succeed
- ❌ 4th request fails with: "Too many OTP requests. Please try again in 1 hour."

---

### Test 10: Email Validation
**Steps**:
1. Enter invalid email (e.g., "notanemail")
2. Click "Send OTP"

**Expected**:
- ❌ Error message: "Please enter a valid email address"
- ✅ OTP not sent

---

## 🐛 Troubleshooting

### Issue: "Failed to send OTP"
**Possible Causes**:
- Backend email service not configured
- Invalid email address
- Network error

**Solution**:
- Check backend logs
- Verify email service is configured (SendGrid, AWS SES, or console logging)
- Check network connection

---

### Issue: "Invalid OTP code"
**Possible Causes**:
- Wrong OTP entered
- OTP expired (10 minutes)
- Max attempts exceeded (3)

**Solution**:
- Check email for correct OTP
- Request new OTP if expired
- Wait 1 hour if rate limited

---

### Issue: "Unauthorized - No token provided"
**Possible Causes**:
- User not logged in
- Token expired
- Token not stored correctly

**Solution**:
- Log in again
- Check console logs for token storage errors
- Verify JWT middleware is working on backend

---

### Issue: "User not found"
**Possible Causes**:
- User account deleted
- Database connection error
- Wrong user ID in token

**Solution**:
- Sign up again
- Check backend logs
- Verify database is accessible

---

## 📊 Expected API Responses

### Send OTP
```json
POST /api/auth/email/send-otp
{
  "email": "test@example.com",
  "fullName": "John Doe",
  "phoneNumber": "+233241234567"
}

Response:
{
  "success": true,
  "expiresIn": 600
}
```

### Verify OTP
```json
POST /api/auth/email/verify-otp
{
  "email": "test@example.com",
  "otpCode": "123456",
  "fullName": "John Doe",
  "phoneNumber": "+233241234567",
  "deviceId": "device_123"
}

Response:
{
  "success": true,
  "user": {
    "id": "user_xxx",
    "fullName": "John Doe",
    "email": "test@example.com",
    "phoneNumber": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-15T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

### Get User Profile
```json
GET /api/user/me
Headers: Authorization: Bearer {accessToken}

Response:
{
  "id": "user_xxx",
  "fullName": "John Doe",
  "email": "test@example.com",
  "phoneNumber": "+233241234567",
  "subscriptionStatus": "trial",
  "trialEndDate": "2024-03-15T00:00:00.000Z",
  "currentPlanId": null,
  "smsConsentGiven": false,
  "smsAutoDetectionEnabled": false
}
```

---

## ✅ Testing Checklist

- [ ] Sign up with email + OTP
- [ ] Verify OTP successfully
- [ ] Resend OTP works
- [ ] Invalid OTP shows error
- [ ] Expired OTP shows error
- [ ] Session persists after app restart
- [ ] Sign out works
- [ ] Sign in again works
- [ ] Protected endpoints work (transactions, settings, etc.)
- [ ] Rate limiting works (3 per hour)
- [ ] Email validation works
- [ ] Dark mode works
- [ ] Pull-to-refresh works
- [ ] Error messages are user-friendly
- [ ] Loading indicators appear during API calls

---

## 📝 Sample Test Users

### User 1
- **Email**: test@example.com
- **Full Name**: John Doe
- **Phone**: +233241234567

### User 2
- **Email**: jane@example.com
- **Full Name**: Jane Smith
- **Phone**: +233241234568

### User 3
- **Email**: admin@example.com
- **Full Name**: Admin User
- **Phone**: +233241234569

---

## 🎯 Success Criteria

After testing, you should be able to:
- ✅ Sign up with email + OTP
- ✅ Log in with email + OTP
- ✅ Stay logged in after app restart
- ✅ Access all protected screens
- ✅ Sign out and sign in again
- ✅ See user profile data
- ✅ View transactions (if any)
- ✅ Update settings
- ✅ View subscription status

---

## 📞 Need Help?

1. **Check console logs** for detailed error messages
2. **Check backend logs** for API errors
3. **Test with Postman** to isolate frontend/backend issues
4. **Verify backend URL** in `app.json` under `expo.extra.backendUrl`

---

**Ready to test?** Follow the steps above and report any issues!
