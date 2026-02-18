
# OTP Authentication Testing Guide

## 🧪 How to Test the OTP Login Flow

### Prerequisites
1. A valid Ghana phone number (e.g., +233241234567)
2. Access to SMS on that phone number
3. The app running on your device/simulator

### Step-by-Step Testing

#### 1. Start the App
```bash
npm start
# or
npx expo start
```

#### 2. Open the Auth Screen
- The app should automatically show the authentication screen if you're not logged in
- You'll see:
  - "MoMo Analytics" title
  - "Enter your phone number to get started" subtitle
  - Full Name input field
  - Phone Number input field
  - "Send OTP" button

#### 3. Enter Your Details
```
Full Name: John Doe
Phone Number: 0241234567
```

**Note**: The app automatically formats the phone number to Ghana format (+233241234567)

#### 4. Send OTP
- Click the "Send OTP" button
- You should see:
  - Loading indicator
  - Success message: "OTP sent to +233241234567. Please check your SMS."
  - The screen switches to OTP input mode
  - A countdown timer starts (60 seconds)

**Console Logs to Check**:
```
[Auth] Sending OTP to: +233241234567
[API] Calling: https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/send-otp
[API] Success: { success: true, expiresIn: 600 }
✅ OTP sent successfully to +233241234567
```

#### 5. Check Your SMS
You should receive an SMS like:
```
Your MoMo Analytics verification code is: 123456. Valid for 10 minutes. Do not share this code.
```

#### 6. Enter the OTP
- Enter the 6-digit code from the SMS
- Click "Verify OTP"
- You should see:
  - Loading indicator
  - Redirect to the home screen (transactions)

**Console Logs to Check**:
```
[Auth] Verifying OTP for: +233241234567
[API] Calling: https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/verify-otp
[API] Success: { success: true, user: {...}, accessToken: "..." }
[Auth] Access token stored successfully
[Auth] User data set: { id: "user_xxx", fullName: "John Doe", ... }
✅ OTP verified successfully, user logged in
```

#### 7. Verify Session Persistence
- Close the app completely
- Reopen the app
- You should be automatically logged in (no redirect to auth screen)

**Console Logs to Check**:
```
TransactionsScreen mounted, user: { id: "user_xxx", fullName: "John Doe", ... }
User authenticated, loading transactions
```

### 🔄 Testing Resend OTP

1. On the OTP input screen, wait for the countdown to reach 0
2. Click "Resend OTP"
3. You should receive a new OTP via SMS
4. The countdown timer resets to 60 seconds

**Console Logs to Check**:
```
[Auth] Resending OTP to: +233241234567
[API] Calling: https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/resend-otp
✅ OTP resent successfully to +233241234567
```

### ❌ Testing Error Cases

#### Invalid Phone Number
```
Phone Number: 123
Expected: "Please enter a valid Ghana phone number (e.g., 0241234567)"
```

#### Invalid OTP Code
```
OTP: 000000
Expected: "Invalid OTP code. Please check and try again."
```

#### Expired OTP
```
Wait 10+ minutes after receiving OTP
Enter the old OTP code
Expected: "OTP has expired"
```

#### Too Many Attempts
```
Enter wrong OTP 3 times
Expected: "Maximum OTP attempts exceeded. Request a new OTP."
```

#### Rate Limiting
```
Request OTP 4 times within 1 hour
Expected: "Too many OTP requests. Please try again in 1 hour."
```

### 🔍 Debugging Tips

#### Check Backend URL
```typescript
// In app.json
"extra": {
  "backendUrl": "https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev"
}
```

#### Check Arkesel API Key
```typescript
// In app.json
"extra": {
  "arkeselApiKey": "[REDACTED]"
}
```

#### Check Console Logs
Open the browser console (web) or React Native debugger (native) to see detailed logs:
- `[API]` prefix: API call logs
- `[Auth]` prefix: Authentication logs
- `[Device]` prefix: Device registration logs

#### Check Network Tab
In the browser dev tools, check the Network tab to see:
- Request URL
- Request headers
- Request body
- Response status
- Response body

### 📱 Platform-Specific Testing

#### iOS
```bash
npx expo start --ios
```
- OTP should be auto-filled from SMS (iOS 12+)
- Token stored in Keychain via expo-secure-store

#### Android
```bash
npx expo start --android
```
- OTP should be auto-filled from SMS (Android 8+)
- Token stored in EncryptedSharedPreferences via expo-secure-store

#### Web
```bash
npx expo start --web
```
- OTP must be manually entered
- Token stored in localStorage

### ✅ Success Criteria

After successful OTP verification, you should:
1. ✅ Be redirected to the transactions screen
2. ✅ See your name in the profile screen
3. ✅ See "Trial Active" badge in the profile (14-day trial)
4. ✅ Be able to navigate between tabs
5. ✅ Remain logged in after closing and reopening the app

### 🚨 Common Issues

#### Issue: "Backend URL not configured"
**Solution**: Check `app.json` and ensure `expo.extra.backendUrl` is set

#### Issue: "Failed to send OTP"
**Solution**: 
- Check Arkesel API key in `app.json`
- Verify phone number is in Ghana format
- Check backend logs for SMS API errors

#### Issue: "Invalid OTP code"
**Solution**:
- Ensure you're entering the correct 6-digit code
- Check if OTP has expired (10 minutes)
- Request a new OTP if needed

#### Issue: "User not authenticated" after OTP verification
**Solution**:
- Check if backend returns `accessToken` in the response
- Verify JWT token is stored in SecureStore/localStorage
- Check console logs for token storage errors

#### Issue: Redirect loop (keeps going back to auth screen)
**Solution**:
- Check if `fetchUser()` is called on app mount
- Verify token is being retrieved from storage
- Check if token is valid (not expired)

### 📊 Expected API Responses

#### Send OTP Success
```json
{
  "success": true,
  "expiresIn": 600
}
```

#### Send OTP Error
```json
{
  "success": false,
  "error": "Invalid Ghana phone number format. Use +233XXXXXXXXX"
}
```

#### Verify OTP Success
```json
{
  "success": true,
  "user": {
    "id": "user_1234567890_abc123",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-15T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Verify OTP Error
```json
{
  "success": false,
  "error": "Invalid OTP code"
}
```

### 🎯 Test Checklist

- [ ] Send OTP to valid Ghana phone number
- [ ] Receive SMS with OTP code
- [ ] Verify OTP successfully
- [ ] Redirect to home screen
- [ ] User data displayed in profile
- [ ] Session persists after app restart
- [ ] Resend OTP works
- [ ] Invalid phone number shows error
- [ ] Invalid OTP shows error
- [ ] Expired OTP shows error
- [ ] Rate limiting works (3 OTP per hour)
- [ ] Sign out works
- [ ] Sign in again works

### 📞 Need Help?

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify the backend is running and accessible
3. Test the API endpoints directly using Postman or curl
4. Check the backend logs for errors

---

**Happy Testing! 🎉**
