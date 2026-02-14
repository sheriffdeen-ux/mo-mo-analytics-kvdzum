
# MoMo Analytics - Testing Guide

## 🎯 Overview

This guide will help you test all the features of the MoMo Analytics application, including authentication, transactions, subscriptions, and analytics.

## 📋 Prerequisites

1. **Backend API is deployed at:** `https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev`
2. **Ghana phone number** for OTP verification (Arkesel SMS API will send real OTP codes)
3. **Paystack test credentials** for payment testing

## 🔐 1. Authentication Testing

### Method 1: Email OTP Login (Primary Method)

**Step 1: Open the App**
- Launch the app on your device/emulator
- You should see the authentication screen with email input

**Step 2: Enter User Details**
- **Email Address:** Enter your email (e.g., "test@example.com")
- **Full Name:** Enter your name (e.g., "John Doe")
- **Phone Number (Optional):** Enter a phone number (e.g., "0241234567")

**Step 3: Send OTP**
- Click "Send OTP" button
- Wait for the OTP code to be sent to your email
- The OTP is valid for **5 minutes**
- **Rate Limit:** Maximum 3 OTP requests per email per hour

**Step 4: Check for OTP**
- **In Production:** Check your email inbox for the OTP code
- **In Development Mode:** Look for the yellow "Development Mode" box that displays the OTP code
  - This box only appears when email verification is disabled in backend
  - Shows: "🔓 Development Mode - Your OTP code is: XXXXXX"

**Step 5: Verify OTP**
- Enter the 6-digit OTP code
- Click "Verify OTP"
- **Maximum 3 attempts** per OTP code
- On successful verification:
  - You'll be logged in
  - A 14-day free trial will be activated
  - You'll have access to all Pro features
  - Redirected to home screen

**Step 6: Resend OTP (if needed)**
- If you didn't receive the OTP, wait for the countdown to reach 0
- Click "Resend OTP"
- A new OTP will be sent to your email
- Previous OTP will be invalidated

### Method 2: Development Bypass (Testing Only) 🔓

This method allows you to skip email verification for faster testing.

**Step 1: Enter Email**
- Open the app
- Enter your email address (e.g., "test@example.com")
- **Do NOT click "Send OTP"**

**Step 2: Use Dev Bypass**
- Scroll down to find the yellow button: **"🔓 Dev Mode: Skip Verification"**
- Click the button

**Expected Result:**
- ✅ Account automatically marked as verified
- ✅ Access token generated
- ✅ Redirected to home screen immediately
- ✅ No OTP required!

**Important Notes:**
- ⚠️ This button only works if the user already exists (must sign up first with OTP)
- ⚠️ If user doesn't exist, you'll see: "User not found. Please sign up first by sending an OTP."
- ⚠️ This is for development/testing only - will be removed in production

### Method 3: Phone Number OTP Login (Legacy)

**Step 1: Open the App**
- Launch the app on your device/emulator
- You should see the authentication screen

**Step 2: Enter User Details**
- **Full Name:** Enter your name (e.g., "John Doe")
- **Phone Number:** Enter a Ghana phone number in any format:
  - `0241234567` (will be auto-converted to `+233241234567`)
  - `+233241234567`
  - `233241234567`

**Step 3: Send OTP**
- Click "Send OTP" button
- Wait for the OTP code to be sent to your phone via SMS
- The OTP is valid for **10 minutes**
- **Rate Limit:** Maximum 3 OTP requests per phone number per hour

**Step 4: Verify OTP**
- Enter the 6-digit OTP code received on your phone
- Click "Verify OTP"
- **Maximum 3 attempts** per OTP code
- On successful verification:
  - You'll be logged in
  - A 14-day free trial will be activated
  - You'll have access to all Pro features

**Step 5: Resend OTP (if needed)**
- If you didn't receive the OTP, click "Resend OTP"
- Wait 60 seconds before requesting another OTP
- Same rate limiting applies

### Expected Results
✅ OTP sent successfully (email or SMS)  
✅ User logged in with 14-day trial  
✅ Redirected to home screen (Transactions)  
✅ User profile shows trial status  
✅ Dev bypass works for existing users  

### Troubleshooting
❌ **"Failed to send OTP"** - Check email/phone format  
❌ **"Invalid OTP code"** - Verify you entered the correct 6-digit code  
❌ **"Rate limit exceeded"** - Wait 1 hour before requesting more OTPs  
❌ **"User not found" (Dev Bypass)** - Sign up first with OTP, then use bypass  
❌ **OTP not received** - Check email spam folder or use dev mode OTP display  

---

## 📱 2. Transactions Testing

### View Transactions

**Step 1: Navigate to Home Screen**
- After login, you should be on the Transactions screen
- You'll see:
  - **Summary Cards:** Total Sent, Total Received, Fraud Detected
  - **Recent Transactions List:** All your MoMo transactions

**Step 2: Transaction Details**
- Each transaction shows:
  - Provider (MTN, Vodafone, AirtelTigo)
  - Transaction type (Sent/Received)
  - Amount
  - Recipient/Sender
  - Balance
  - Risk Level (LOW, MEDIUM, HIGH, CRITICAL)
  - Risk Reasons (if any)
  - Date/Time

### Transaction Actions

**Step 1: Tap on a Transaction**
- Tap any transaction card
- A modal will appear with action options

**Step 2: Available Actions**

#### A. Confirm Safe
- Click "This is Safe" button
- **Purpose:** Tell the AI this transaction is legitimate
- **Effect:** After 10 safe confirmations, alert sensitivity decreases
- **Response:** `{ success: true, newSensitivity: number }`

#### B. Block Merchant
- Click "Block Merchant" button
- **Purpose:** Block all future transactions from this merchant
- **Effect:** Merchant added to your blocked list
- **Response:** `{ success: true }`

#### C. Report Fraud
- Click "Report Fraud" button
- **Purpose:** Report this transaction as fraudulent
- **Effect:** Alert sensitivity increases for better protection
- **Response:** `{ success: true, newSensitivity: number }`

### Expected Results
✅ Transaction list loads successfully  
✅ Summary cards show correct totals  
✅ Actions execute without errors  
✅ UI updates after each action  

---

## 💳 3. Subscription Testing

### View Subscription Plans

**Step 1: Navigate to Upgrade Screen**
- Go to Profile tab
- Tap "Upgrade" card (if on trial/free plan)
- Or navigate directly to `/upgrade`

**Step 2: View Available Plans**

#### Free Plan
- **Price:** GHS 0
- **Features:**
  - SMS detection
  - Basic fraud scoring
  - Risk alerts
  - Last 30 transactions
  - Basic daily summary

#### Pro Plan
- **Weekly:** GHS 7
- **Monthly:** GHS 30
- **Yearly:** GHS 240
- **Features:**
  - Full 7-layer fraud engine
  - Unlimited transaction history
  - Daily/Weekly/Monthly analytics
  - Money sent vs received charts
  - Custom daily spending limits
  - Advanced alerts
  - Export to CSV
  - Merchant insights

#### Business Plan
- **Weekly:** GHS 40
- **Monthly:** GHS 99
- **Features:**
  - All Pro features
  - Multi-device support
  - Central dashboard
  - Staff monitoring
  - Real-time fraud alerts
  - Transaction reconciliation reports
  - Monthly revenue breakdown
  - Exportable financial reports

### Subscribe to a Plan

**Step 1: Select a Plan**
- Choose a plan (e.g., Pro Weekly - GHS 7)
- Click "Subscribe" button

**Step 2: Paystack Payment**
- You'll be redirected to Paystack payment page
- **Test Card Details:**
  - **Card Number:** 4084084084084081
  - **CVV:** 408
  - **Expiry:** Any future date (e.g., 12/25)
  - **PIN:** 0000
  - **OTP:** 123456

**Step 3: Complete Payment**
- Enter test card details
- Complete the payment flow
- You'll be redirected back to the app

**Step 4: Verify Subscription**
- Go to Profile screen
- Check subscription status badge
- Should show "PRO" or "BUSINESS"
- Trial badge should be removed

### Expected Results
✅ Plans load successfully  
✅ Payment page opens  
✅ Payment completes successfully  
✅ Subscription status updates  
✅ Features unlock based on plan  

---

## ⚙️ 4. Settings Testing

### Update Settings

**Step 1: Navigate to Profile**
- Go to Profile tab
- Scroll to "Settings" section

**Step 2: Update Daily Limit**
- Current default: GHS 2000
- Change to a new value (e.g., GHS 5000)
- Click "Save Settings"

**Step 3: Update SMS Reading Preference**
- Choose between:
  - **MoMo SMS Only** (recommended)
  - **All SMS**
- Click "Save Settings"

### Expected Results
✅ Settings save successfully  
✅ Daily limit updates  
✅ SMS preference updates  
✅ Success message appears  

---

## 📊 5. Analytics Testing

### View Analytics Summary

**Step 1: Check Home Screen Summary**
- Summary cards show:
  - Total Sent
  - Total Received
  - Fraud Detected

**Step 2: View Detailed Analytics**
- Navigate to Profile > Analytics (if available)
- Or check the API response for:
  - Daily stats (last 7 days)
  - Weekly stats (last 4 weeks)
  - Monthly stats (last 6 months)
  - Money protected

### Expected Results
✅ Summary loads correctly  
✅ Charts display data  
✅ Stats are accurate  

---

## 📄 6. Privacy Policy Testing

**Step 1: Navigate to Privacy Policy**
- Go to Profile tab
- Tap "Privacy Policy" button

**Step 2: View Policy**
- Policy text should load from backend
- If backend fails, fallback policy displays

### Expected Results
✅ Policy loads successfully  
✅ Text is readable  
✅ Fallback works if API fails  

---

## 🔄 7. Logout Testing

**Step 1: Sign Out**
- Go to Profile tab
- Tap "Sign Out" button
- Confirm in the modal

**Step 2: Verify Logout**
- You should be redirected to auth screen
- Session should be cleared
- No user data should persist

### Expected Results
✅ User logged out successfully  
✅ Redirected to auth screen  
✅ Session cleared  

---

## 🧪 8. API Endpoint Testing

### Test All Endpoints

Use the following curl commands to test endpoints directly:

#### 1. Send Email OTP
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567"
  }'
```

#### 2. Verify Email OTP
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otpCode": "123456",
    "fullName": "John Doe",
    "deviceId": "test-device-123",
    "phoneNumber": "+233241234567"
  }'
```

#### 3. Resend Email OTP
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### 4. Mark Email as Verified (Dev Mode Only)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/mark-verified \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### 5. Send Phone OTP (Legacy)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233241234567"}'
```

#### 6. Verify Phone OTP (Legacy)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+233241234567",
    "otpCode": "123456",
    "fullName": "John Doe",
    "deviceId": "test-device-123"
  }'
```

#### 7. Get Subscription Plans
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/subscriptions/plans
```

#### 8. Get Subscription Status (Protected)
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/subscriptions/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 9. Get Transactions (Protected)
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions?page=1&limit=20 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 10. Get Analytics Summary (Protected)
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/analytics/summary \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 11. Get Settings (Protected)
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/settings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 12. Update Settings (Protected)
```bash
curl -X PUT https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/settings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dailyLimit": 5000,
    "smsReadPreference": "momo_only"
  }'
```

#### 13. Block Merchant (Protected)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions/TRANSACTION_ID/block \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 14. Report Fraud (Protected)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions/TRANSACTION_ID/report-fraud \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 15. Confirm Safe (Protected)
```bash
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions/TRANSACTION_ID/confirm-safe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 16. Get Privacy Policy
```bash
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/legal/privacy-policy
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Backend URL not configured"
**Solution:** Rebuild the app. The backend URL is set in `app.json` and requires a rebuild.

### Issue 2: "Authentication token not found"
**Solution:** Log out and log back in. The token may have expired.

### Issue 3: "Failed to send OTP"
**Solution:** 
- Check phone number format (must be Ghana number starting with +233)
- Verify Arkesel API key is configured correctly
- Check rate limiting (max 3 OTPs per hour)

### Issue 4: "Payment failed"
**Solution:**
- Use Paystack test card: 4084084084084081
- Ensure you're using test mode credentials
- Check Paystack dashboard for errors

### Issue 5: "Transactions not loading"
**Solution:**
- Check if user is authenticated
- Verify backend API is running
- Check console logs for errors

---

## ✅ Test Checklist

Use this checklist to ensure all features are tested:

### Authentication
- [ ] Send email OTP
- [ ] Receive OTP via email
- [ ] Verify email OTP successfully
- [ ] Login with 14-day trial
- [ ] Resend email OTP works
- [ ] Dev bypass button works (existing users)
- [ ] Dev mode OTP display works (development)
- [ ] Send phone OTP (legacy)
- [ ] Receive OTP via SMS (legacy)
- [ ] Verify phone OTP successfully (legacy)
- [ ] Rate limiting enforced
- [ ] Logout works

### Transactions
- [ ] View transaction list
- [ ] See summary cards
- [ ] Tap transaction for details
- [ ] Confirm transaction as safe
- [ ] Block merchant
- [ ] Report fraud
- [ ] Pull to refresh works

### Subscriptions
- [ ] View all plans
- [ ] See trial status
- [ ] Subscribe to Pro plan
- [ ] Complete Paystack payment
- [ ] Subscription status updates
- [ ] Features unlock correctly

### Settings
- [ ] View current settings
- [ ] Update daily limit
- [ ] Change SMS preference
- [ ] Save settings successfully
- [ ] View blocked merchants count
- [ ] View trusted merchants count

### Analytics
- [ ] View summary cards
- [ ] See total sent/received
- [ ] See fraud detected count
- [ ] Daily/weekly/monthly stats load

### Privacy & Legal
- [ ] View privacy policy
- [ ] Policy loads from backend
- [ ] Fallback policy works

---

## 📞 Support

If you encounter any issues during testing:

1. **Check Console Logs:** Look for `[API]`, `[Auth]`, `[Upgrade]` prefixed logs
2. **Verify Backend Status:** Ensure `https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/health` returns 200
3. **Check Network Tab:** Inspect API requests/responses in browser dev tools
4. **Review Error Messages:** Read error messages carefully for hints

---

## 🎉 Success Criteria

Your integration is successful if:

✅ All authentication flows work  
✅ Transactions load and display correctly  
✅ Transaction actions execute successfully  
✅ Subscription plans load  
✅ Payment flow completes  
✅ Settings save correctly  
✅ Analytics display accurate data  
✅ Privacy policy loads  
✅ Logout works properly  
✅ No console errors  
✅ All API calls return expected responses  

---

## 📝 Notes

- **Trial Period:** 14 days from signup
- **OTP Expiry:** 10 minutes
- **Rate Limiting:** 3 OTPs per phone per hour
- **Payment:** Test mode using Paystack test cards
- **SMS Reading:** User can choose between "MoMo Only" or "All SMS"
- **Data Privacy:** SMS messages are NOT stored, only extracted transaction data

---

**Happy Testing! 🚀**
