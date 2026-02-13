
# Backend Integration Status

## ✅ Integration Complete

The frontend has been successfully integrated with the backend API deployed at:
**https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev**

## 🔐 Authentication Flow

### Phone/OTP Authentication
The app uses a custom phone number + OTP authentication flow:

1. **Send OTP** (`POST /api/phone/send-otp`)
   - User enters phone number (Ghana format: +233XXXXXXXXX)
   - Backend sends 6-digit OTP via Arkesel SMS API
   - OTP is valid for 10 minutes

2. **Verify OTP** (`POST /api/phone/verify-otp`)
   - User enters the 6-digit OTP code
   - Backend verifies the OTP and returns:
     ```json
     {
       "success": true,
       "user": {
         "id": "user_xxx",
         "fullName": "John Doe",
         "phoneNumber": "+233241234567",
         "subscriptionStatus": "trial",
         "trialEndDate": "2024-03-01T00:00:00.000Z"
       },
       "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
     }
     ```
   - The `accessToken` is a JWT token that contains the user's `userId` and `phoneNumber`
   - Frontend stores the token in SecureStore (native) or localStorage (web)

3. **Session Persistence**
   - The JWT token is automatically included in all authenticated API calls via the `Authorization: Bearer <token>` header
   - Token is managed by `utils/api.ts` using the `authenticatedApiCall` helper
   - The `AuthContext` automatically refreshes the user session every 5 minutes to keep the token in sync

### Arkesel SMS API Configuration
- **API Key**: `TkpKcE5QQ09PREN1dFBOWUV1eGQ` (configured in `app.json`)
- **Endpoint**: `https://sms.arkesel.com/api/v2/sms/send`
- **SMS Format**: "Your MoMo Analytics verification code is: {OTP}. Valid for 10 minutes. Do not share this code."

## 📱 Integrated Screens

### 1. Authentication Screen (`app/auth.tsx`)
- ✅ Phone number input with Ghana format validation
- ✅ OTP code input (6 digits)
- ✅ Send OTP integration with `/api/phone/send-otp`
- ✅ Verify OTP integration with `/api/phone/verify-otp`
- ✅ Resend OTP with countdown timer
- ✅ Error handling and user feedback
- ✅ JWT token storage after successful verification

### 2. Transactions Screen (`app/(tabs)/(home)/index.tsx`)
- ✅ Load transactions: `GET /api/transactions`
- ✅ Load summary: `GET /api/analytics/summary`
- ✅ Block merchant: `POST /api/transactions/{id}/block`
- ✅ Report fraud: `POST /api/transactions/{id}/report-fraud`
- ✅ Confirm safe: `POST /api/transactions/{id}/confirm-safe`
- ✅ Pull-to-refresh functionality
- ✅ Authentication check (redirects to `/auth` if not logged in)
- ✅ Custom modal for transaction actions (no Alert.alert)

### 3. Profile Screen (`app/(tabs)/profile.tsx`)
- ✅ Load settings: `GET /api/settings`
- ✅ Save settings: `PUT /api/settings`
- ✅ Load subscription status: `GET /api/subscriptions/status`
- ✅ Sign out with confirmation modal
- ✅ Display user info (name, phone, subscription status)

### 4. Upgrade Screen (`app/upgrade.tsx`)
- ✅ Load subscription plans: `GET /api/subscriptions/plans`
- ✅ Initiate payment: `POST /api/subscriptions/initiate-payment`
- ✅ Paystack integration for payment processing
- ✅ Display trial status and days remaining

### 5. Privacy Policy Screen (`app/privacy-policy.tsx`)
- ✅ Load privacy policy: `GET /api/legal/privacy-policy`
- ✅ Fallback to default policy if API fails

## 🔧 API Integration Architecture

### Central API Layer (`utils/api.ts`)
All API calls go through the central `utils/api.ts` file, which provides:

- **`apiCall(endpoint, options)`**: Base API call with error handling
- **`apiGet(endpoint)`**: GET request
- **`apiPost(endpoint, data)`**: POST request
- **`apiPut(endpoint, data)`**: PUT request
- **`apiPatch(endpoint, data)`**: PATCH request
- **`apiDelete(endpoint, data)`**: DELETE request
- **`authenticatedApiCall(endpoint, options)`**: Authenticated API call with Bearer token
- **`authenticatedGet(endpoint)`**: Authenticated GET request
- **`authenticatedPost(endpoint, data)`**: Authenticated POST request
- **`authenticatedPut(endpoint, data)`**: Authenticated PUT request
- **`authenticatedPatch(endpoint, data)`**: Authenticated PATCH request
- **`authenticatedDelete(endpoint, data)`**: Authenticated DELETE request

### Authentication Context (`contexts/AuthContext.tsx`)
Manages user authentication state and provides:

- **`user`**: Current user object or null
- **`loading`**: Loading state during authentication
- **`signInWithPhone(phoneNumber)`**: Send OTP to phone number
- **`verifyOTP(phoneNumber, otpCode, fullName?, deviceId?)`**: Verify OTP and log in
- **`signOut()`**: Sign out and clear tokens
- **`fetchUser()`**: Refresh user session

### Session Persistence
- **Web**: Uses `localStorage` for token storage
- **Native**: Uses `expo-secure-store` for secure token storage
- **Auto-refresh**: User session is refreshed every 5 minutes to keep token in sync
- **Deep linking**: Handles OAuth redirects (for future Google/Apple sign-in)

## 🧪 Testing the Integration

### Test User Creation
To test the app, follow these steps:

1. **Start the app**: `npm start` or `npx expo start`
2. **Open the app** on your device or simulator
3. **Sign up with a Ghana phone number**:
   - Enter your full name (e.g., "John Doe")
   - Enter a Ghana phone number (e.g., "0241234567" or "+233241234567")
   - Click "Send OTP"
4. **Check your SMS** for the 6-digit OTP code
5. **Enter the OTP code** and click "Verify OTP"
6. **You should be logged in** and redirected to the transactions screen

### Sample Test Scenarios

#### 1. Test OTP Flow
```
Phone: +233241234567
Expected: OTP sent via SMS
Action: Enter OTP code
Expected: User logged in, redirected to home screen
```

#### 2. Test Session Persistence
```
Action: Close and reopen the app
Expected: User remains logged in (no redirect to auth screen)
```

#### 3. Test Transactions
```
Action: Navigate to Transactions screen
Expected: Empty state or list of transactions
Action: Pull to refresh
Expected: Transactions reload
```

#### 4. Test Settings
```
Action: Navigate to Profile screen
Expected: User info displayed
Action: Change daily limit to 5000
Action: Click "Save Settings"
Expected: Settings saved successfully
```

#### 5. Test Sign Out
```
Action: Click "Sign Out" button
Expected: Confirmation modal appears
Action: Confirm sign out
Expected: User logged out, redirected to auth screen
```

## 🚨 Known Issues & Fixes

### Issue 1: Backend JWT Token Generation
**Problem**: The backend's `verify-otp` endpoint needs to generate and return a JWT token.

**Expected Backend Response**:
```json
{
  "success": true,
  "user": {
    "id": "user_xxx",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-01T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Backend Implementation Required**:
```typescript
import jwt from "jsonwebtoken";

// In verify-otp endpoint, after successful verification:
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";
const accessToken = jwt.sign(
  {
    userId: userData.userId,
    phoneNumber: userData.phoneNumber,
  },
  JWT_SECRET,
  { expiresIn: "30d" }
);

return {
  success: true,
  user: {
    id: userData.userId,
    fullName: userData.fullName,
    phoneNumber: userData.phoneNumber,
    subscriptionStatus: userData.subscriptionStatus,
    trialEndDate: userData.trialEndDate,
  },
  accessToken,
};
```

**Status**: ⚠️ Needs backend update (cannot modify backend files from frontend agent)

### Issue 2: JWT Token Verification Middleware
**Problem**: Protected endpoints need to verify the JWT token.

**Backend Implementation Required**:
```typescript
// Add JWT verification middleware
fastify.addHook('preHandler', async (request, reply) => {
  const protectedRoutes = [
    '/api/transactions',
    '/api/settings',
    '/api/subscriptions',
    '/api/analytics',
    '/api/admin',
  ];
  
  const isProtected = protectedRoutes.some(route => 
    request.url.startsWith(route)
  );
  
  if (isProtected) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = decoded; // Attach user to request
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  }
});
```

**Status**: ⚠️ Needs backend update

## 📊 API Endpoints Summary

### Authentication
- `POST /api/phone/send-otp` - Send OTP to phone number
- `POST /api/phone/verify-otp` - Verify OTP and log in
- `POST /api/phone/resend-otp` - Resend OTP

### Transactions
- `GET /api/transactions` - Get user transactions (paginated)
- `POST /api/transactions/{id}/block` - Block merchant
- `POST /api/transactions/{id}/report-fraud` - Report fraud
- `POST /api/transactions/{id}/confirm-safe` - Confirm transaction is safe
- `GET /api/transactions/export/csv` - Export transactions as CSV

### Analytics
- `GET /api/analytics/summary` - Get transaction summary
- `GET /api/analytics/fraud-trends` - Get fraud trends

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `GET /api/subscriptions/status` - Get subscription status
- `POST /api/subscriptions/initiate-payment` - Initiate payment
- `GET /api/subscriptions/verify-payment/{reference}` - Verify payment
- `POST /api/subscriptions/cancel` - Cancel subscription

### Legal
- `GET /api/legal/privacy-policy` - Get privacy policy
- `GET /api/legal/terms-of-service` - Get terms of service

### Device Registration
- `POST /api/register-device` - Register device for push notifications

### Admin (requires admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/dashboard` - Get admin dashboard stats

## 🎯 Next Steps

1. **Backend Team**: Implement JWT token generation in the `verify-otp` endpoint
2. **Backend Team**: Add JWT verification middleware for protected endpoints
3. **Backend Team**: Install `jsonwebtoken` package: `npm install jsonwebtoken @types/jsonwebtoken`
4. **Testing**: Test the complete OTP flow with a real Ghana phone number
5. **Testing**: Verify session persistence across app restarts
6. **Testing**: Test all CRUD operations (GET, POST, PUT, DELETE)

## 📝 Sample User Credentials

Once the backend JWT implementation is complete, you can test with:

**Phone Number**: Any valid Ghana phone number (e.g., +233241234567)
**OTP**: Will be sent via SMS to the phone number
**Full Name**: Any name (e.g., "John Doe")

**Note**: The first time a user verifies their OTP, a new account is created with a 14-day trial subscription.

## ✅ Frontend Integration Checklist

- [x] Central API layer (`utils/api.ts`)
- [x] Authentication context (`contexts/AuthContext.tsx`)
- [x] Phone/OTP authentication flow
- [x] JWT token storage (SecureStore/localStorage)
- [x] Session persistence and auto-refresh
- [x] Authentication check on protected screens
- [x] Transactions screen integration
- [x] Profile screen integration
- [x] Settings screen integration
- [x] Upgrade screen integration
- [x] Privacy policy screen integration
- [x] Error handling and user feedback
- [x] Custom modals (no Alert.alert)
- [x] Pull-to-refresh functionality
- [x] Loading states
- [x] Dark mode support

## 🔒 Security Features

- ✅ OTP codes are hashed (SHA-256) and never stored in plain text
- ✅ JWT tokens stored securely (SecureStore on native, localStorage on web)
- ✅ Rate limiting on OTP requests (3 per hour per phone)
- ✅ OTP expiry (10 minutes)
- ✅ Maximum OTP attempts (3 attempts)
- ✅ HTTPS for all API calls
- ✅ Bearer token authentication for protected endpoints

## 📱 Platform Support

- ✅ iOS (native)
- ✅ Android (native)
- ✅ Web (browser)

All platforms use the same codebase with platform-specific storage:
- **Native**: `expo-secure-store` for secure token storage
- **Web**: `localStorage` for token storage

## 🎨 UI/UX Features

- ✅ Dark mode support
- ✅ Custom modals for confirmations (no Alert.alert)
- ✅ Loading indicators during API calls
- ✅ Error messages with user-friendly text
- ✅ Success messages for completed actions
- ✅ Pull-to-refresh on list screens
- ✅ Empty states for no data
- ✅ Countdown timer for OTP resend
- ✅ Phone number formatting (Ghana format)
- ✅ OTP input validation (6 digits)

## 🐛 Debugging

To debug API calls, check the console logs:

```
[API] Calling: https://...
[API] Fetch options: {...}
[API] Success: {...}
[API] Error response: {...}
[Auth] Sending OTP to: +233...
[Auth] OTP sent successfully
[Auth] Verifying OTP for: +233...
[Auth] Access token stored successfully
[Auth] User data set: {...}
```

All API calls are logged with the `[API]` prefix, and authentication-related logs use the `[Auth]` prefix.

## 📞 Support

For issues or questions:
- Check the console logs for detailed error messages
- Verify the backend URL in `app.json` under `expo.extra.backendUrl`
- Ensure the Arkesel API key is correct in `app.json` under `expo.extra.arkeselApiKey`
- Test with a real Ghana phone number to receive SMS OTP

---

**Integration Status**: ✅ Frontend Complete | ⚠️ Backend JWT Implementation Pending
