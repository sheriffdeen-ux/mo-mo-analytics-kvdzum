
# Quick Start Testing Guide 🚀

## Prerequisites
- Node.js installed
- Expo CLI installed (`npm install -g expo-cli`)
- A Ghana phone number for testing (will receive SMS OTP)

---

## 1. Start the Development Server

```bash
# Install dependencies (if not already done)
npm install

# Start Expo development server
npm start
# or
npx expo start
```

---

## 2. Open the App

### Option A: Web Browser (Easiest)
- Press `w` in the terminal
- Or open http://localhost:8081 in your browser

### Option B: iOS Simulator (Mac only)
- Press `i` in the terminal
- Or scan the QR code with the Expo Go app

### Option C: Android Emulator
- Press `a` in the terminal
- Or scan the QR code with the Expo Go app

### Option D: Physical Device
- Install Expo Go app from App Store / Play Store
- Scan the QR code shown in the terminal

---

## 3. Test Authentication Flow

### Step 1: Sign Up / Sign In
1. You'll see the authentication screen
2. Enter your details:
   - **Full Name:** John Doe
   - **Business Name:** (optional) Doe Enterprises
   - **Phone Number:** Your Ghana phone number (e.g., 0241234567)
3. Click **"Send OTP via SMS"**
4. Wait for SMS (usually arrives within seconds)

### Step 2: Verify OTP
1. Check your phone for the 6-digit OTP code
2. Enter the OTP in the app
3. Click **"Verify OTP"**
4. You'll be logged in and redirected to the home screen

### Step 3: Explore the App
- **Home Tab:** View dashboard and analytics
- **Profile Tab:** View your profile and subscription status
- **Settings:** Manage your preferences

### Step 4: Test Session Persistence
1. Close the app completely
2. Reopen the app
3. You should remain logged in (no need to enter OTP again)

### Step 5: Test Sign Out
1. Go to **Profile** tab
2. Scroll down and click **"Sign Out"**
3. Confirm sign out
4. You'll be redirected to the authentication screen

---

## 4. Test API Endpoints (Optional)

### Get Your Access Token
1. Open the app
2. Open browser console (F12)
3. Look for logs like: `[Auth] Access token stored successfully`
4. Or check localStorage: `localStorage.getItem('momo-analytics_bearer_token')`

### Test API Calls

```bash
# Replace YOUR_TOKEN with your actual access token
TOKEN="your_access_token_here"

# Test 1: Get current user
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/user/me \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Get subscription status
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/subscriptions/status \
  -H "Authorization: Bearer $TOKEN"

# Test 3: Get transactions
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions \
  -H "Authorization: Bearer $TOKEN"

# Test 4: Get analytics summary
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/analytics/summary \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Common Test Scenarios

### Scenario 1: New User Registration
1. Use a phone number that hasn't been registered before
2. Enter full name and phone number
3. Request OTP
4. Verify OTP
5. **Expected:** New user created with 14-day trial subscription

### Scenario 2: Existing User Login
1. Use a phone number that's already registered
2. Request OTP
3. Verify OTP
4. **Expected:** User logged in with existing subscription status

### Scenario 3: Invalid OTP
1. Request OTP
2. Enter wrong OTP code (e.g., 000000)
3. **Expected:** Error message "Invalid OTP code"

### Scenario 4: Expired OTP
1. Request OTP
2. Wait 11 minutes (OTP expires after 10 minutes)
3. Try to verify OTP
4. **Expected:** Error message "OTP has expired"

### Scenario 5: Rate Limiting
1. Request OTP 3 times in a row
2. Try to request OTP a 4th time
3. **Expected:** Error message "Too many OTP requests. Please wait 1 hour."

### Scenario 6: Resend OTP
1. Request OTP
2. Wait for countdown to finish (60 seconds)
3. Click "Resend OTP"
4. **Expected:** New OTP sent, countdown resets

---

## 6. Debugging Tips

### Check Console Logs
- Open browser console (F12)
- Look for logs prefixed with `[Auth]`, `[API]`, `[Profile]`, etc.
- These logs show detailed information about API calls and errors

### Common Issues

**"Backend URL not configured"**
- Check `app.json` → `expo.extra.backendUrl`
- Rebuild: `npx expo start --clear`

**"Failed to send OTP"**
- Verify phone number format (+233XXXXXXXXX or 0XXXXXXXXX)
- Check backend is running
- Check SMS service credits

**"Network error"**
- Check internet connection
- Verify backend URL is accessible
- Try: `curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/health`

**"Authentication token not found"**
- User needs to log in again
- Token may have expired (30 days)
- Clear storage and log in again

---

## 7. Test Data

### Phone Number Formats (Ghana)
All these formats are accepted:
- `+233241234567` (preferred)
- `0241234567`
- `233241234567`
- `0233241234567`

### Sample User Data
```json
{
  "fullName": "John Doe",
  "businessName": "Doe Enterprises",
  "phoneNumber": "0241234567"
}
```

### Expected Response After OTP Verification
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abcdef",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "email": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-01T00:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 2592000,
  "tokenType": "Bearer"
}
```

---

## 8. Performance Testing

### Test Session Persistence
1. Log in
2. Close app
3. Reopen app
4. **Expected:** User remains logged in (< 1 second load time)

### Test API Response Times
1. Log in
2. Navigate to different tabs
3. **Expected:** API calls complete within 2-3 seconds

### Test Offline Behavior
1. Log in
2. Turn off internet
3. Navigate around the app
4. **Expected:** Graceful error messages, no crashes

---

## 9. Security Testing

### Test Token Expiration
1. Log in
2. Wait 30 days (or manually expire token in storage)
3. Try to access protected endpoints
4. **Expected:** Redirected to login screen

### Test Invalid Token
1. Log in
2. Manually modify token in storage
3. Try to access protected endpoints
4. **Expected:** Error message, redirected to login

### Test Rate Limiting
1. Request OTP 3 times quickly
2. Try to request OTP again
3. **Expected:** Rate limit error

---

## 10. Success Criteria

✅ **Authentication:**
- [ ] Can send OTP via SMS
- [ ] Can verify OTP and log in
- [ ] Can resend OTP
- [ ] Session persists after app restart
- [ ] Can sign out successfully

✅ **User Profile:**
- [ ] Can view user profile
- [ ] Can see subscription status
- [ ] Can see trial end date (for new users)

✅ **Navigation:**
- [ ] Can navigate between tabs
- [ ] Auth guard redirects to login when not authenticated
- [ ] Auth guard allows access when authenticated

✅ **Error Handling:**
- [ ] Invalid OTP shows error message
- [ ] Expired OTP shows error message
- [ ] Rate limiting shows error message
- [ ] Network errors show error message

✅ **Security:**
- [ ] Token stored securely
- [ ] Token sent in Authorization header
- [ ] Protected endpoints require authentication
- [ ] Sign out clears token

---

## 11. Next Steps After Testing

### If Everything Works ✅
- App is ready for deployment
- Can proceed with production testing
- Can onboard real users

### If Issues Found ❌
1. Check console logs for error details
2. Verify backend URL configuration
3. Check network connectivity
4. Review error messages
5. Contact support if needed

---

## 📞 Support

**Backend URL:** https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev

**Health Check:**
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

---

## 🎉 Happy Testing!

The app is fully functional and ready for testing. Follow this guide to test all authentication flows and API integrations.

**Remember:** Use a real Ghana phone number to receive SMS OTP codes!
