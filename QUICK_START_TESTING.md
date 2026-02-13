
# 🚀 Quick Start Testing Guide

## Prerequisites
- Ghana phone number that can receive SMS
- Expo app installed on your device or simulator
- Backend running at: https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev

---

## Step 1: Start the App
```bash
npm start
# or
npx expo start
```

---

## Step 2: Test Sign Up (First Time User)

### 2.1 Open the App
- You should see the authentication screen with:
  - "MoMo Analytics" title
  - App logo
  - "Enter your phone number to get started" subtitle
  - Full Name input field
  - Phone Number input field
  - "Send OTP" button

### 2.2 Enter Your Details
- **Full Name**: Enter your name (e.g., "John Doe")
- **Phone Number**: Enter a Ghana phone number
  - Format: `0241234567` or `+233241234567`
  - The app will automatically format it to `+233XXXXXXXXX`

### 2.3 Send OTP
- Click the **"Send OTP"** button
- You should see:
  - Loading indicator
  - Success message: "OTP sent to +233XXXXXXXXX. Please check your SMS."
  - The screen changes to OTP input mode

### 2.4 Check Your SMS
- You should receive an SMS with:
  - "Your MoMo Analytics verification code is: XXXXXX. Valid for 10 minutes. Do not share this code."
  - The OTP code is 6 digits

### 2.5 Enter OTP
- Enter the 6-digit OTP code
- Click **"Verify OTP"**
- You should see:
  - Loading indicator
  - Success! You're logged in
  - Redirected to the Transactions screen

### 2.6 Verify Login
- You should now see the **Transactions screen** with:
  - "MoMo Analytics" header
  - Summary cards (Total Sent, Total Received, Fraud Detected)
  - "Recent Transactions" section
  - Empty state if no transactions yet

---

## Step 3: Test Session Persistence

### 3.1 Close the App
- Completely close the app (swipe away from recent apps)

### 3.2 Reopen the App
- Open the app again
- **Expected Result**: 
  - You should remain logged in
  - No redirect to auth screen
  - Transactions screen loads immediately
  - No need to enter OTP again

---

## Step 4: Test User Profile

### 4.1 Navigate to Profile
- Tap the **"Profile"** tab at the bottom

### 4.2 Verify Profile Data
- You should see:
  - Your profile picture icon
  - Your full name
  - Your phone number
  - Subscription badge: **"TRIAL"**
  - Trial days remaining (e.g., "14 days left")

### 4.3 Check Settings
- You should see:
  - **Daily Limit**: Default 2000 GHS
  - **SMS Reading**: "MoMo SMS Only" selected
  - **Blocked Merchants**: 0
  - **Trusted Merchants**: 0

---

## Step 5: Test Settings Update

### 5.1 Change Daily Limit
- Tap the **Daily Limit** input field
- Change the value to `5000`

### 5.2 Save Settings
- Click **"Save Settings"**
- You should see:
  - Loading indicator
  - Success message: "✅ Settings saved successfully!"

### 5.3 Verify Persistence
- Close and reopen the app
- Navigate to Profile
- **Expected**: Daily limit should still be 5000

---

## Step 6: Test Sign Out

### 6.1 Sign Out
- Navigate to Profile tab
- Scroll down to the bottom
- Click **"Sign Out"** button (red button)

### 6.2 Confirm Sign Out
- A modal should appear asking: "Are you sure you want to sign out?"
- Click **"Sign Out"** to confirm

### 6.3 Verify Sign Out
- You should be:
  - Logged out
  - Redirected to the auth screen
  - Token cleared from storage

---

## Step 7: Test Sign In (Returning User)

### 7.1 Enter Phone Number
- Enter the same phone number you used before
- Click **"Send OTP"**

### 7.2 Verify OTP
- Check your SMS for the new OTP code
- Enter the OTP code
- Click **"Verify OTP"**

### 7.3 Verify Login
- You should be logged in
- Your previous account data should be loaded:
  - Same subscription status
  - Same settings (daily limit = 5000)
  - Same profile information

---

## ✅ Success Criteria

If all the above steps work correctly, the integration is successful! ✅

### What Should Work:
- ✅ New user sign up with OTP
- ✅ OTP sent via SMS
- ✅ OTP verification and login
- ✅ Session persistence across app restarts
- ✅ User profile display
- ✅ Settings update and persistence
- ✅ Sign out functionality
- ✅ Returning user sign in

---

## 🐛 Common Issues

### Issue 1: OTP Not Received
**Possible Causes**:
- Invalid phone number format
- Arkesel SMS API rate limiting
- SMS service temporarily unavailable

**Solution**:
- Verify phone number is in Ghana format (+233XXXXXXXXX)
- Wait a few minutes and try again
- Check backend logs for SMS API errors

### Issue 2: "Invalid OTP code"
**Possible Causes**:
- OTP expired (10 minutes)
- Incorrect OTP code
- Maximum attempts exceeded (3 attempts)

**Solution**:
- Request a new OTP by clicking "Resend OTP"
- Double-check the OTP code from SMS
- Wait for the countdown timer before resending

### Issue 3: App Redirects to Auth Screen After Login
**Possible Causes**:
- JWT token not stored correctly
- `/api/user/me` endpoint not working
- Token verification failed

**Solution**:
- Check console logs for error messages
- Verify backend is running
- Try signing out and signing in again

### Issue 4: "Authentication token not found"
**Possible Causes**:
- OTP verification didn't complete successfully
- Token storage failed

**Solution**:
- Complete the OTP verification flow again
- Check console logs for storage errors
- Verify SecureStore/localStorage is working

---

## 📊 Console Logs to Watch

### Successful Flow:
```
[Auth] Sending OTP to: +233241234567
✅ OTP sent successfully to +233241234567
[Auth] Verifying OTP for: +233241234567
[Auth] JWT access token stored successfully
[Auth] User data set: { id: 'user_xxx', fullName: 'John Doe', ... }
✅ OTP verified successfully, user logged in
[Auth] Found bearer token, attempting to fetch user
[Auth] User fetched successfully via bearer token
```

### Error Flow:
```
❌ Failed to send OTP: Error: ...
❌ OTP verification failed: Error: ...
[Auth] Failed to fetch user with bearer token: Error: ...
```

---

## 🎯 Next Steps After Testing

1. **If all tests pass**: The integration is complete! 🎉
2. **If any test fails**: Check the console logs and troubleshooting guide
3. **Report issues**: Document any errors and share with the development team
4. **Test edge cases**: Try invalid phone numbers, expired OTPs, etc.
5. **Test on multiple platforms**: iOS, Android, and Web

---

**Happy Testing!** 🚀

**Last Updated**: ${new Date().toISOString()}
