# MoMo Analytics

A comprehensive Mobile Money fraud detection and analytics platform for Ghana.

## 🚀 Features

### Authentication
- **Phone Number Login** with SMS OTP verification (via Arkesel)
- **14-Day Free Trial** with full access to Pro features
- **Device Binding** for enhanced security
- **JWT Token Authentication** with refresh tokens

### Subscription Plans

#### Free Plan
- SMS detection
- Basic fraud scoring
- Risk alerts
- Last 30 transactions
- Basic daily summary

#### Pro Plan
- Full 7-layer fraud engine
- Unlimited transaction history
- Daily/Weekly/Monthly analytics
- Money sent vs received charts
- Custom daily spending limits
- Advanced alerts (real-time high priority)
- Export to CSV
- Merchant insights

**Pricing:**
- Weekly: GHS 7
- Monthly: GHS 30
- Yearly: GHS 240

#### Business Plan
- All Pro features
- Multi-device support
- Central dashboard
- Staff monitoring
- Real-time fraud alerts
- Transaction reconciliation reports
- Monthly revenue breakdown
- Exportable financial reports

**Pricing:**
- Weekly: GHS 40
- Monthly: GHS 99

### Security Features
- Secure input validation
- Rate limiting on all endpoints
- OTP codes hashed (never stored plain)
- PINs never stored in plain text
- Encrypted data transmission
- Device binding for multi-factor authentication

### SMS Processing
- **User Choice:** Read all SMS or only Mobile Money SMS
- **Privacy First:** SMS messages are NOT stored, only extracted transaction data
- **Automatic Detection:** Analyzes transactions from MTN, Vodafone, AirtelTigo

### Adaptive Alert System
- **Personalized Learning:** AI adapts to your transaction patterns
- **Confirm Safe:** Lower sensitivity after 10 safe confirmations
- **Report Fraud:** Increase sensitivity when fraud is detected
- **Elite Behavior Modeling:** Your AI becomes personalized over time

## 🔧 Backend API

**Base URL:** `https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev`

### Authentication Endpoints

#### Send OTP
```
POST /api/phone/send-otp
Body: { phoneNumber: string }
Response: { success: true, expiresIn: 600 }
```

#### Verify OTP
```
POST /api/phone/verify-otp
Body: { phoneNumber: string, otpCode: string, fullName?: string, deviceId: string }
Response: { user: {...}, accessToken: string, refreshToken: string }
```

#### Resend OTP
```
POST /api/phone/resend-otp
Body: { phoneNumber: string }
Response: { success: true, expiresIn: 600 }
```

### Subscription Endpoints

#### Get Plans
```
GET /api/subscriptions/plans
Response: { plans: [...] }
```

#### Get Subscription Status
```
GET /api/subscriptions/status (Protected)
Response: { subscriptionStatus, currentPlan, trialEndDate, daysRemaining, features, canAccessFeature }
```

#### Initiate Payment
```
POST /api/subscriptions/initiate-payment (Protected)
Body: { planId: string }
Response: { authorizationUrl: string, reference: string }
```

#### Cancel Subscription
```
POST /api/subscriptions/cancel (Protected)
Response: { success: true, endsAt: string }
```

### Transaction Endpoints

#### Get Transactions
```
GET /api/transactions (Protected)
Query: page, limit
Response: { transactions: [...], total, page, totalPages }
```

#### Block Merchant
```
POST /api/transactions/:id/block (Protected)
Response: { success: true }
```

#### Report Fraud
```
POST /api/transactions/:id/report-fraud (Protected)
Response: { success: true, newSensitivity: number }
```

#### Confirm Safe
```
POST /api/transactions/:id/confirm-safe (Protected)
Response: { success: true, newSensitivity: number }
```

#### Export CSV
```
GET /api/transactions/export/csv (Protected)
Response: CSV file
```

### Analytics Endpoints

#### Get Summary
```
GET /api/analytics/summary (Protected)
Response: { totalSent, totalReceived, dailyStats, weeklyStats, monthlyStats, fraudDetected, moneyProtected }
```

#### Get Fraud Trends
```
GET /api/analytics/fraud-trends (Protected)
Response: { trends: [...] }
```

### Settings Endpoints

#### Get Settings
```
GET /api/settings (Protected)
Response: { dailyLimit, blockedMerchants, trustedMerchants, smsReadPreference }
```

#### Update Settings
```
PUT /api/settings (Protected)
Body: { dailyLimit?, smsReadPreference? }
Response: { updated settings }
```

### Legal Endpoints

#### Privacy Policy
```
GET /api/legal/privacy-policy
Response: { policy: string }
```

#### Terms of Service
```
GET /api/legal/terms-of-service
Response: { terms: string }
```

## 🧪 Testing the Application

### 1. Authentication Flow

**Test Phone Number:** Use any Ghana phone number format:
- `0241234567` (will be converted to `+233241234567`)
- `+233241234567`
- `233241234567`

**OTP Code:** The backend will send a real OTP via Arkesel SMS API. Check your phone for the code.

**Sample Test User:**
- **Full Name:** John Doe
- **Phone Number:** +233241234567
- **OTP:** Check your phone for the 6-digit code

**Test Steps:**
1. Open the app
2. Enter your full name (e.g., "John Doe")
3. Enter your Ghana phone number (e.g., "0241234567")
4. Click "Send OTP"
5. Check your phone for the OTP code (valid for 10 minutes)
6. Enter the 6-digit code
7. Click "Verify OTP"
8. You should be logged in with a 14-day trial

**Important Notes:**
- OTP codes expire after 10 minutes
- Maximum 3 OTP requests per phone number per hour (rate limiting)
- Maximum 3 verification attempts per OTP code
- After successful login, you get 14 days free trial with full Pro features

### 2. Trial Period

After successful login:
- You get **14 days free access** to all Pro features
- Check the Profile screen to see your trial status
- Days remaining will be displayed

### 3. Transactions

The app will:
- Automatically analyze SMS messages (based on your preference)
- Extract transaction data (amount, sender, receiver, provider)
- Calculate fraud risk scores
- Display transactions on the home screen

**Test Actions:**
1. Tap on any transaction
2. Choose an action:
   - **This is Safe:** Lowers alert sensitivity (after 10 confirmations)
   - **Block Merchant:** Blocks future transactions from this merchant
   - **Report Fraud:** Increases alert sensitivity for better protection

### 4. Settings

Navigate to Profile > Settings:
- **Daily Limit:** Set your daily spending limit (e.g., GHS 2000)
- **SMS Reading:** Choose between "MoMo SMS Only" or "All SMS"
- Click "Save Settings"

### 5. Subscription Upgrade

Navigate to Profile > Upgrade:
1. View available plans (Free, Pro, Business)
2. Select a plan (e.g., Pro Weekly - GHS 7)
3. Click "Subscribe"
4. You'll be redirected to Paystack payment page
5. Complete payment using:
   - **Test Card:** 4084084084084081
   - **CVV:** 408
   - **Expiry:** Any future date
   - **PIN:** 0000
   - **OTP:** 123456

### 6. Analytics

View your financial insights:
- Total Sent
- Total Received
- Fraud Detected
- Money Protected
- Daily/Weekly/Monthly trends

### 7. Privacy Policy

Navigate to Profile > Privacy Policy to view the complete privacy policy.

## 🔐 API Keys & Configuration

The following keys are configured in `app.json`:

```json
{
  "extra": {
    "backendUrl": "https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev",
    "arkeselApiKey": "TkpKcE5QQ09PREN1dFBOWUV1eGQ",
    "paystackPublicKey": "pk_live_b77def2981f5ddf85b842e00e94ad4171e9641f6"
  }
}
```

**Backend Secret Keys (Server-side only):**
- Paystack Secret: `sk_live_11dc621fcdffc09bbd9281145a03c4dc6fea6224`
- Arkesel API Key: `TkpKcE5QQ09PREN1dFBOWUV1eGQ`

## 📱 Running the App

### Development
```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run on Web
npx expo start --web
```

### Production Build
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 🏗️ Project Structure

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
│   └── AuthContext.tsx            # Authentication state management
├── utils/
│   └── api.ts                     # API client with Bearer token support
├── lib/
│   └── auth.ts                    # Better Auth client configuration
└── app.json                       # App configuration
```

## 🔒 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** on all endpoints
4. **Validate all inputs** on both client and server
5. **Hash sensitive data** (OTPs, PINs) before storage
6. **Use HTTPS** for all API communications
7. **Implement proper error handling** without exposing sensitive information

## 📄 Privacy & Data Handling

- **SMS messages are NOT stored** - only extracted transaction data
- **User data is encrypted** in transit and at rest
- **OTP codes are hashed** and expire after 10 minutes
- **PINs are never stored** in plain text
- **Users can delete their data** at any time
- **GDPR compliant** data handling

## 🤝 Support

For issues or questions:
- Email: support@momoanalytics.com
- Check the Privacy Policy for data handling information

## 📝 License

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for creativity.
