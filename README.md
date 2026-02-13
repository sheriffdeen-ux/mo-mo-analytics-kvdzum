# MoMo Analytics

A Mobile Money fraud detection system for Ghana that automatically analyzes MoMo transactions in real-time and alerts users to suspicious activity.

## 🚀 Features

- **Real-time Transaction Monitoring**: View all your MoMo transactions with risk analysis
- **7-Layer Fraud Detection**: Advanced AI-powered fraud detection system
- **Risk Scoring**: Transactions scored 0-100 with risk levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Financial Analytics**: Track total sent/received, daily/weekly/monthly stats
- **Merchant Management**: Block suspicious merchants or mark trusted ones
- **Fraud Reporting**: Report fraudulent transactions for investigation
- **User Settings**: Customize daily spending limits
- **Multi-Provider Support**: MTN MoMo, Vodafone Cash, AirtelTigo Money

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Framework**: Expo 54 with React Native
- **Authentication**: Better Auth with email/password + Google OAuth
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: React Native StyleSheet with dark mode support

### Backend (Specular Framework)
- **Framework**: Specular with Fastify
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **API**: RESTful API with OpenAPI documentation

## 📱 Screens

1. **Transactions Screen** (`/(tabs)/(home)/`)
   - View all transactions with risk indicators
   - Summary cards (Total Sent, Total Received, Fraud Detected)
   - Transaction details with risk reasons
   - Pull-to-refresh functionality
   - Tap transaction to block merchant or report fraud

2. **Profile Screen** (`/(tabs)/profile`)
   - User information
   - Settings management (daily limit)
   - Blocked/trusted merchants count
   - Sign out functionality

3. **Auth Screen** (`/auth`)
   - Email/password sign in/sign up
   - Google OAuth integration
   - Automatic redirect after authentication

## 🔐 Authentication Flow

1. User opens app → Redirected to `/auth` if not authenticated
2. User signs up/signs in with email or Google
3. Backend creates session and returns bearer token
4. Token stored in SecureStore (native) or localStorage (web)
5. Device registered with backend for push notifications
6. User redirected to `/(tabs)/(home)/`
7. All API calls include bearer token in Authorization header

## 🧪 Testing Instructions

### Prerequisites
```bash
npm install
```

### Test User Credentials

**Option 1: Create a new account**
- Email: `test@momoanalytics.com`
- Password: `Test123!@#`
- Name: `Test User`

**Option 2: Use Google OAuth**
- Click "Continue with Google" on auth screen
- Sign in with any Google account

### Testing Workflow

1. **Start the app**
   ```bash
   npm run dev
   ```

2. **Sign Up/Sign In**
   - Open the app in Expo Go or web browser
   - Create account or sign in with test credentials
   - Verify redirect to transactions screen

3. **Test Transaction List**
   - View transactions (will be empty initially)
   - Pull down to refresh
   - Check summary cards display correctly

4. **Test Transaction Actions**
   - Tap any transaction card
   - Modal should appear with transaction details
   - Test "Block Merchant" button
   - Test "Report Fraud" button
   - Verify console logs show success messages

5. **Test Settings**
   - Navigate to Profile tab
   - Change daily limit (e.g., from 2000 to 3000)
   - Click "Save Settings"
   - Verify console shows success message
   - Refresh to confirm settings persisted

6. **Test Sign Out**
   - Click "Sign Out" button in Profile
   - Verify redirect to auth screen
   - Verify can't access protected routes without auth

### API Endpoints Integrated

✅ **Authentication**
- `POST /api/auth/sign-in/email` - Email sign in
- `POST /api/auth/sign-up/email` - Email sign up
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Sign out

✅ **Device Registration**
- `POST /api/register-device` - Register device for push notifications

✅ **Transactions**
- `GET /api/transactions` - Get paginated transaction list
- `POST /api/transactions/:id/block` - Block merchant
- `POST /api/transactions/:id/report-fraud` - Report fraud

✅ **Analytics**
- `GET /api/analytics/summary` - Get financial summary

✅ **Settings**
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

### Expected Behavior

**On First Load:**
- Empty transaction list with "No transactions yet" message
- Summary cards show 0 values
- Settings show default daily limit (2000 GHS)

**After Adding Transactions (via SMS or API):**
- Transactions appear in list with risk badges
- Summary cards update with totals
- High/Critical risk transactions show risk reasons
- Can interact with transactions to block/report

**Error Handling:**
- Network errors logged to console
- Failed API calls don't crash app
- User sees empty states instead of errors
- Loading indicators during API calls

## 🔧 Configuration

### Backend URL
The backend URL is configured in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev"
    }
  }
}
```

### API Client
All API calls use the centralized `utils/api.ts` wrapper:
```typescript
import { authenticatedGet, authenticatedPost } from '@/utils/api';

// GET request
const data = await authenticatedGet('/api/transactions');

// POST request
const result = await authenticatedPost('/api/settings', { dailyLimit: 3000 });
```

## 📊 Fraud Detection Layers

1. **Time-Based**: Late night transactions (2am-5am) get higher risk scores
2. **Amount Analysis**: Large amounts (>1000 GHS) flagged
3. **Daily Limit**: Transactions exceeding user's daily limit
4. **Velocity**: Multiple transactions in short time periods
5. **Merchant Blocking**: User-blocked or globally blacklisted merchants
6. **Round Amounts**: Exact amounts (100, 500, 1000) are suspicious
7. **Balance Analysis**: Low balance after transaction

## 🎨 Design System

### Colors
- **Primary**: Ghana Gold (#FFD700)
- **Secondary**: Ghana Green (#006B3F)
- **Risk Levels**:
  - LOW: Green (#10B981)
  - MEDIUM: Amber (#F59E0B)
  - HIGH: Red (#EF4444)
  - CRITICAL: Dark Red (#DC2626)

### Dark Mode
Full dark mode support with automatic theme switching based on system preferences.

## 🚨 Important Notes

1. **No Alert() Usage**: All alerts replaced with console.log for web compatibility
2. **Session Persistence**: Auth tokens stored securely and persist across app restarts
3. **Cross-Platform**: Works on iOS, Android, and Web
4. **Error Logging**: All errors logged to console with emoji indicators (✅ ❌ ⚠️)

## 📝 Development Notes

### Adding New Endpoints
1. Add endpoint to `utils/api.ts` if needed
2. Import and use in component:
   ```typescript
   const { authenticatedGet } = await import('@/utils/api');
   const data = await authenticatedGet('/api/new-endpoint');
   ```

### Adding New Screens
1. Create file in `app/(tabs)/` directory
2. Add route to `app/(tabs)/_layout.tsx`
3. Add tab to `FloatingTabBar` configuration

## 🤝 Contributing

This app was built using [Natively.dev](https://natively.dev) - a platform for creating mobile apps.

Made with 💙 for Ghana's Mobile Money users.
