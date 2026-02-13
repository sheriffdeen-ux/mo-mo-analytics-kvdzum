
# 🚨 Backend Action Required: JWT Implementation

## ⚡ Quick Summary

The frontend is **100% complete** and integrated with the backend. However, the OTP authentication flow needs JWT token support to work properly.

**Current Status**:
- ✅ OTP SMS sending works (Arkesel API integrated)
- ✅ OTP verification works (user creation, validation)
- ❌ JWT token generation missing
- ❌ JWT token verification missing

**Impact**: Users can receive OTP codes but cannot complete login because the backend doesn't return a JWT token.

---

## 🎯 Required Changes (3 Steps)

### Step 1: Install JWT Package (1 minute)

```bash
cd backend
npm install jsonwebtoken @types/jsonwebtoken
```

---

### Step 2: Update `backend/src/routes/auth.ts` (5 minutes)

#### Add JWT Import
At the top of the file, add:
```typescript
import jwt from "jsonwebtoken";
```

#### Add JWT Secret Constant
After the imports, add:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "momo-analytics-secret-key-change-in-production";
```

#### Update the `verify-otp` Endpoint
Find this section in the `POST /api/phone/verify-otp` endpoint:

**CURRENT CODE** (around line 150):
```typescript
app.logger.info(
  { userId: userData.userId, phoneNumber: normalizedPhone },
  "User authenticated via OTP"
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
};
```

**REPLACE WITH**:
```typescript
// Generate JWT token
const accessToken = jwt.sign(
  {
    userId: userData.userId,
    phoneNumber: userData.phoneNumber,
  },
  JWT_SECRET,
  { expiresIn: "30d" }
);

app.logger.info(
  { userId: userData.userId, phoneNumber: normalizedPhone },
  "User authenticated via OTP"
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
  accessToken, // Add JWT token to response
};
```

---

### Step 3: Add JWT Verification Middleware in `backend/src/index.ts` (10 minutes)

#### Add JWT Import
At the top of the file, add:
```typescript
import jwt from "jsonwebtoken";
```

#### Add JWT Secret Constant
After the imports, add:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || "momo-analytics-secret-key-change-in-production";
```

#### Add JWT Verification Middleware
After `app.withAuth();` and before the route registrations, add:

```typescript
// JWT Authentication Middleware for Phone/OTP users
app.fastify.addHook('preHandler', async (request, reply) => {
  // List of protected routes that require authentication
  const protectedRoutes = [
    '/api/transactions',
    '/api/settings',
    '/api/subscriptions/status',
    '/api/subscriptions/initiate-payment',
    '/api/subscriptions/cancel',
    '/api/analytics',
    '/api/register-device',
    '/api/admin',
  ];
  
  // Check if the current route is protected
  const isProtected = protectedRoutes.some(route => 
    request.url.startsWith(route)
  );
  
  if (!isProtected) {
    return; // Allow public routes
  }
  
  // Extract Authorization header
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    app.logger.warn({ url: request.url }, 'Unauthorized request - No token');
    return reply.code(401).send({ 
      success: false, 
      error: 'Unauthorized - Authentication required' 
    });
  }
  
  // Extract token (remove 'Bearer ' prefix)
  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { 
      userId: string; 
      phoneNumber: string; 
    };
    
    // Attach user info to request for use in route handlers
    (request as any).user = decoded;
    
    app.logger.info({ userId: decoded.userId }, 'Authenticated request');
    
  } catch (error) {
    app.logger.warn({ url: request.url, error }, 'Invalid token');
    return reply.code(401).send({ 
      success: false, 
      error: 'Unauthorized - Invalid or expired token' 
    });
  }
});
```

---

### Step 4: Update Route Handlers to Use User Info (Optional but Recommended)

In route handlers that need to filter by user, access the user info from `request.user`:

**Example**: `backend/src/routes/transactions.ts`

```typescript
// Before (no user filtering):
fastify.get("/api/transactions", async (request: FastifyRequest) => {
  const transactions = await app.db
    .select()
    .from(schema.transactions);
  
  return { transactions };
});

// After (with user filtering):
fastify.get("/api/transactions", async (request: FastifyRequest) => {
  const user = (request as any).user; // { userId, phoneNumber }
  
  const transactions = await app.db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, user.userId));
  
  return { transactions };
});
```

Apply this pattern to:
- `backend/src/routes/transactions.ts` - Filter transactions by userId
- `backend/src/routes/settings.ts` - Filter settings by userId
- `backend/src/routes/subscriptions.ts` - Filter subscriptions by userId
- `backend/src/routes/analytics.ts` - Filter analytics by userId

---

## 🧪 Testing the Changes

### 1. Rebuild and Deploy Backend
```bash
cd backend
npm run build
# Deploy to your hosting platform
```

### 2. Test OTP Flow
```bash
# In the frontend
npm start
```

1. Open the app
2. Enter phone number: `+233241234567`
3. Click "Send OTP"
4. Check SMS for OTP code
5. Enter OTP code
6. Click "Verify OTP"

**Expected Result**:
- ✅ User is logged in
- ✅ Redirected to home screen
- ✅ Console shows: `[Auth] Access token stored successfully`

### 3. Test Protected Endpoints
```bash
# Test with curl
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Result**:
- ✅ Returns user's transactions
- ❌ Without token: Returns 401 Unauthorized

---

## 📊 Expected API Responses

### Before Changes (Current)
```json
POST /api/phone/verify-otp
{
  "success": true,
  "user": {
    "id": "user_xxx",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-15T00:00:00.000Z"
  }
}
```

### After Changes (Required)
```json
POST /api/phone/verify-otp
{
  "success": true,
  "user": {
    "id": "user_xxx",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "subscriptionStatus": "trial",
    "trialEndDate": "2024-03-15T00:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyX3h4eCIsInBob25lTnVtYmVyIjoiKzIzMzI0MTIzNDU2NyIsImlhdCI6MTcwOTU1NjAwMCwiZXhwIjoxNzEyMTQ4MDAwfQ.xxx"
}
```

---

## 🔒 Security Considerations

### JWT Secret
**Important**: Change the JWT secret in production!

```bash
# Set environment variable
export JWT_SECRET="your-super-secret-key-here-min-32-chars"
```

Or in your hosting platform's environment variables:
```
JWT_SECRET=your-super-secret-key-here-min-32-chars
```

### Token Expiry
Current setting: 30 days
```typescript
{ expiresIn: "30d" }
```

You can adjust this based on your security requirements:
- `"7d"` - 7 days (more secure)
- `"30d"` - 30 days (current)
- `"90d"` - 90 days (less secure)

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'jsonwebtoken'"
**Solution**: Run `npm install jsonwebtoken @types/jsonwebtoken`

### Issue: "Unauthorized - No token provided"
**Solution**: Check that the frontend is sending the `Authorization: Bearer <token>` header

### Issue: "Invalid or expired token"
**Solution**: 
- Check that JWT_SECRET matches between token generation and verification
- Check that the token hasn't expired (30 days)
- Try logging in again to get a fresh token

### Issue: "User not found in request"
**Solution**: Check that the JWT middleware is running before the route handler

---

## ✅ Verification Checklist

After implementing the changes:

- [ ] `npm install jsonwebtoken @types/jsonwebtoken` completed
- [ ] JWT import added to `backend/src/routes/auth.ts`
- [ ] JWT token generation added to `verify-otp` endpoint
- [ ] JWT import added to `backend/src/index.ts`
- [ ] JWT verification middleware added
- [ ] Backend rebuilt and deployed
- [ ] OTP flow tested (SMS received)
- [ ] OTP verification tested (token received)
- [ ] Protected endpoint tested (with token)
- [ ] Protected endpoint tested (without token - should fail)
- [ ] Session persistence tested (app restart)

---

## 📞 Need Help?

If you encounter issues:

1. **Check backend logs** for JWT errors
2. **Check frontend console** for token storage errors
3. **Test with Postman** to isolate frontend/backend issues
4. **Verify JWT_SECRET** is the same for signing and verification

---

## 🎯 Summary

**Time Required**: 15-30 minutes
**Files to Modify**: 2 files (`auth.ts`, `index.ts`)
**Dependencies**: 1 package (`jsonwebtoken`)
**Impact**: Enables complete authentication flow

Once these changes are deployed, the app will be **fully functional** with:
- ✅ Phone/OTP authentication
- ✅ JWT token-based sessions
- ✅ Protected API endpoints
- ✅ Session persistence
- ✅ Multi-device support

---

**Ready to implement?** Follow the steps above and test thoroughly!
