
# MoMo Analytics - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Prerequisites
- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Ghana phone number for testing
- iOS Simulator / Android Emulator / Physical device

### 2. Installation

```bash
# Clone or navigate to the project directory
cd /path/to/momo-analytics

# Install dependencies
npm install

# Start the development server
npx expo start
```

### 3. Run the App

Choose your platform:

```bash
# iOS Simulator
Press 'i' in the terminal

# Android Emulator
Press 'a' in the terminal

# Web Browser
Press 'w' in the terminal

# Physical Device
Scan the QR code with Expo Go app
```

### 4. Test Authentication

1. **Open the app** - You'll see the authentication screen
2. **Enter your details:**
   - Full Name: `John Doe`
   - Phone Number: `0241234567` (or any Ghana number)
3. **Send OTP** - Click "Send OTP" button
4. **Check your phone** - You'll receive a 6-digit OTP via SMS
5. **Verify OTP** - Enter the code and click "Verify OTP"
6. **Success!** - You're now logged in with a 14-day trial

### 5. Explore Features

#### Home Screen (Transactions)
- View your transaction history
- See fraud risk scores
- Tap transactions to:
  - Confirm as safe
  - Block merchant
  - Report fraud

#### Profile Screen
- View subscription status
- Update settings (daily limit, SMS preferences)
- Upgrade to Pro/Business plans
- View privacy policy
- Sign out

#### Upgrade Screen
- View all subscription plans
- Subscribe using Paystack test card:
  - Card: `4084084084084081`
  - CVV: `408`
  - PIN: `0000`
  - OTP: `123456`

### 6. Test API Endpoints

All endpoints are live at:
`https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev`

Test with curl:

```bash
# Health check
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/health

# Send OTP
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/phone/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+233241234567"}'

# Get subscription plans
curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/subscriptions/plans
```

### 7. Check Logs

Monitor the console for detailed logs:

```
[API] Calling: https://...
[Auth] Sending OTP to phone: +233...
[Auth] OTP sent successfully
[Auth] Verifying OTP for phone: +233...
[Auth] OTP verified successfully, user logged in
```

### 8. Troubleshooting

**Issue:** "Backend URL not configured"  
**Solution:** The URL is already configured in `app.json`. Just rebuild the app.

**Issue:** "Failed to send OTP"  
**Solution:** Ensure you're using a valid Ghana phone number (+233...)

**Issue:** "Invalid OTP code"  
**Solution:** Check your phone for the correct 6-digit code. OTP expires in 10 minutes.

**Issue:** "Authentication token not found"  
**Solution:** Log out and log back in to refresh your session.

### 9. Project Structure

```
├── app/
│   ├── (tabs)/
│   │   ├── (home)/
│   │   │   └── index.tsx          # Transactions screen
│   │   └── profile.tsx            # Profile & settings
│   ├── auth.tsx                   # Phone OTP authentication
│   ├── upgrade.tsx                # Subscription plans
│   └── privacy-policy.tsx         # Privacy policy
├── contexts/
│   └── AuthContext.tsx            # Authentication state
├── utils/
│   └── api.ts                     # API client wrapper
├── lib/
│   └── auth.ts                    # Better Auth config
└── app.json                       # App configuration
```

### 10. Key Files

- **`app.json`** - Backend URL and API keys
- **`utils/api.ts`** - Central API wrapper with Bearer token support
- **`contexts/AuthContext.tsx`** - Authentication logic
- **`app/auth.tsx`** - Login screen with OTP
- **`app/(tabs)/(home)/index.tsx`** - Transactions screen
- **`app/(tabs)/profile.tsx`** - Profile and settings
- **`app/upgrade.tsx`** - Subscription plans

### 11. Environment Variables

All configuration is in `app.json`:

```json
{
  "extra": {
    "backendUrl": "https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev",
    "arkeselApiKey": "TkpKcE5QQ09PREN1dFBOWUV1eGQ",
    "paystackPublicKey": "pk_live_b77def2981f5ddf85b842e00e94ad4171e9641f6"
  }
}
```

### 12. Next Steps

1. ✅ Test authentication flow
2. ✅ View transactions
3. ✅ Test transaction actions
4. ✅ Subscribe to a plan
5. ✅ Update settings
6. ✅ View analytics
7. ✅ Test logout

### 13. Documentation

- **README.md** - Complete project documentation
- **TESTING_GUIDE.md** - Comprehensive testing guide
- **INTEGRATION_SUMMARY.md** - Backend integration details
- **QUICK_START.md** - This file

### 14. Support

For issues or questions:
- Check console logs for detailed error messages
- Review `TESTING_GUIDE.md` for troubleshooting
- Verify backend status: `curl https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/health`

### 15. Production Deployment

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Deploy web version
npx expo export:web
```

---

## 🎉 You're All Set!

The app is fully integrated with the backend and ready to use. All features are working:

✅ Phone OTP Authentication  
✅ 14-Day Free Trial  
✅ Transaction Management  
✅ Fraud Detection  
✅ Subscription Plans  
✅ Paystack Payments  
✅ Analytics Dashboard  
✅ User Settings  
✅ Privacy Policy  

**Happy coding! 🚀**
