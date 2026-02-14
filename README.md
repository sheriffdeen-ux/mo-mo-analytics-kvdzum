# MoMo Analytics - 7-Layer Security Framework

A comprehensive Mobile Money fraud detection and analytics platform with real-time AI-powered security.

Built with [Natively.dev](https://natively.dev) - Made with 💙 for creativity.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npx expo start
   ```

3. **Run on your device**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for Web Browser
   - Scan QR code with Expo Go app on your phone

## 🔐 Testing the App

### Quick Test Mode (No Backend Required)
1. Launch the app
2. Click **"🚀 Skip Login (Testing Mode)"** on the auth screen
3. Explore all features with mock data

### Full Backend Integration Test
1. **Create an account:**
   - Email: `test@example.com`
   - Password: `password123`
   - Full Name: `Test User`
   - Phone: `0241234567` (optional)

2. **Sign in with the same credentials**

3. **Test Features:**
   - View transactions on home screen
   - Analyze SMS messages in AI Chatbot
   - Check security alerts
   - View 7-layer security dashboard
   - Manage blacklist
   - View behavior profile
   - Generate financial reports

## 🛡️ 7-Layer Security Framework

### Layer 1: SMS Capture
- Automatic SMS forwarding from Android devices
- Manual SMS paste in chatbot
- Multi-provider support (MTN, Vodafone, AirtelTigo)

### Layer 2: Input Validation
- Request sanitization
- Rate limiting (100 SMS/hour)
- Payload verification

### Layer 3: Pattern Recognition & NLP
- Scam keyword detection
- Sentiment analysis
- Unusual phrasing detection

### Layer 4: Behavioral Analytics
- User transaction profiling
- Velocity checks
- Anomaly detection

### Layer 5: Real-Time Risk Scoring
- Amount-based thresholds
- Time pattern analysis
- Recipient blacklist checks
- Round amount detection

### Layer 6: Alert System
- In-app alerts (CRITICAL/HIGH/MEDIUM/LOW)
- Push notifications for critical alerts
- Alert management and actions

### Layer 7: Compliance & Audit Trail
- Complete audit logging
- GDPR compliance
- Data encryption
- 90-day retention policy

## 📱 Key Features

### 🏠 Home Screen
- Transaction history with risk scores
- Summary cards (Total Sent/Received/Fraud Detected)
- Transaction actions (Block Merchant, Report Fraud, Confirm Safe)

### 🤖 AI Chatbot
- Manual SMS analysis
- 7-layer security scanning
- Real-time fraud detection
- Transaction insights

### 🔔 Security Alerts
- Real-time fraud alerts
- Risk level filtering
- Alert actions (Safe/Block/Report)
- Unread alert tracking

### 📊 Security Dashboard
- 7-layer performance metrics
- Risk distribution visualization
- Transaction statistics
- Quick action buttons

### 👤 Behavior Profile
- Average transaction amount
- Typical transaction times
- Frequent recipients
- 30-day summary
- Anomaly threshold

### 🚫 Blacklist Management
- User-specific blacklist
- Global blacklist (community-shared)
- Add/remove recipients
- Risk level indicators

### 💰 Financial Reports
- Daily/Weekly/Monthly summaries
- Net balance calculation
- Transaction statistics
- Fraud detection counts

### ⚙️ SMS Auto-Reply Settings
- Enable/disable auto-reply
- Reply only if no fraud
- Include financial summaries
- Custom reply templates

### 🌟 Subscription Plans
- Free tier with basic features
- Pro tier with advanced analytics
- Business tier for enterprises
- Paystack payment integration

## 🔗 Backend Integration

### Backend URL
```
https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev
```

### Key Endpoints

#### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/user/me` - Get current user

#### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions/{id}/block` - Block merchant
- `POST /api/transactions/{id}/report-fraud` - Report fraud
- `POST /api/transactions/{id}/confirm-safe` - Confirm safe

#### 7-Layer Security
- `POST /api/chatbot/analyze-sms` - Analyze SMS through 7 layers
- `GET /api/security-layers/transaction/{id}` - Get layer analysis
- `GET /api/dashboard/security-overview` - Security dashboard data

#### Alerts
- `GET /api/alerts/in-app` - Get in-app alerts
- `PUT /api/alerts/in-app/{id}/read` - Mark alert as read
- `PUT /api/alerts/in-app/{id}/dismiss` - Dismiss alert
- `POST /api/alerts/in-app/{id}/action` - Record alert action

#### Behavior & Blacklist
- `GET /api/user-behavior-profile` - Get behavior profile
- `GET /api/recipient-blacklist` - Get blacklist
- `POST /api/recipient-blacklist` - Add to blacklist
- `DELETE /api/recipient-blacklist/{id}` - Remove from blacklist

#### Financial Reports
- `GET /api/financial-reports/daily` - Daily report
- `GET /api/financial-reports/weekly` - Weekly report
- `GET /api/financial-reports/monthly` - Monthly report

#### Settings
- `GET /api/sms/auto-reply-settings` - Get SMS settings
- `PUT /api/sms/auto-reply-settings` - Update SMS settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

#### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/initiate-payment` - Start payment

## 🎨 Design System

### Colors
- **Primary:** Ghana Gold (#FFD700)
- **Secondary:** Ghana Green (#006B3F)
- **Accent:** Security Blue (#2563EB)
- **Risk Levels:**
  - Low: Green (#10B981)
  - Medium: Amber (#F59E0B)
  - High: Red (#EF4444)
  - Critical: Dark Red (#DC2626)

## 📂 Project Structure

```
expo-project/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── (home)/              # Home tab
│   │   │   └── index.tsx        # Transaction list
│   │   └── profile.tsx          # Profile screen
│   ├── alerts.tsx               # Security alerts
│   ├── auth.tsx                 # Authentication
│   ├── behavior-profile.tsx     # Behavior analytics
│   ├── blacklist.tsx            # Blacklist management
│   ├── chatbot.tsx              # AI fraud analyzer
│   ├── financial-reports.tsx    # Financial reports
│   ├── security-dashboard.tsx   # 7-layer dashboard
│   ├── sms-settings.tsx         # SMS auto-reply settings
│   └── upgrade.tsx              # Subscription plans
├── components/                   # Reusable components
├── contexts/                     # React contexts
│   └── AuthContext.tsx          # Authentication context
├── lib/                         # Libraries
│   └── auth.ts                  # Better Auth client
├── utils/                       # Utilities
│   └── api.ts                   # API client
├── styles/                      # Styles
│   └── commonStyles.ts          # Common styles & colors
└── app.json                     # Expo configuration
```

## 🚨 Troubleshooting

### "Backend URL not configured"
- Rebuild the app: `npx expo start --clear`
- Check `app.json` has `extra.backendUrl`

### "Authentication token not found"
- Sign out and sign in again
- Clear app data and restart

### "Network error"
- Check internet connection
- Verify backend URL is accessible

## 📄 License

This project is proprietary and confidential.
