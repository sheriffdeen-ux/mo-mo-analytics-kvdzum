
# 🚀 Quick Test Guide - MoMo Analytics

## ⚡ TL;DR - Start Testing in 30 Seconds

### 1. Create Account (No Email Verification Required!)
```
Email: test@example.com
Password: TestPass123
Full Name: Test User
Phone: 0241234567 (optional)
```

### 2. Login Immediately
```
Email: test@example.com
Password: TestPass123
```

### 3. Explore Features
- ✅ View home screen (transactions)
- ✅ Check profile (subscription status)
- ✅ Browse upgrade plans
- ✅ Test logout/login

---

## 🎯 What Changed?

**Backend Update**: Email verification is now **BYPASSED** for testing

**Before**:
1. Signup → Email sent → Wait for verification → Login ❌

**After**:
1. Signup → Login immediately → Use app ✅

---

## 🧪 Test Scenarios

### Scenario 1: New User Signup
1. Open app
2. Click "Don't have an account? Sign up"
3. Fill form and submit
4. **Expected**: Redirected to home screen immediately

### Scenario 2: Existing User Login
1. Open app
2. Enter email and password
3. Click "Sign In"
4. **Expected**: Logged in without verification prompt

### Scenario 3: Session Persistence
1. Login to app
2. Close app completely
3. Reopen app
4. **Expected**: Still logged in, no redirect to auth screen

### Scenario 4: Logout
1. Go to Profile tab
2. Click "Sign Out"
3. Confirm logout
4. **Expected**: Redirected to auth screen, session cleared

---

## 🔧 API Endpoints Working

All these endpoints are integrated and working:

### Auth ✅
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/user/me` - Get current user

### Transactions ✅
- `GET /api/transactions` - List transactions
- `POST /api/transactions/{id}/block` - Block merchant
- `POST /api/transactions/{id}/report-fraud` - Report fraud
- `POST /api/transactions/{id}/confirm-safe` - Confirm safe

### Analytics ✅
- `GET /api/analytics/summary` - Transaction summary
- `GET /api/analytics/fraud-trends` - Fraud trends

### Subscriptions ✅
- `GET /api/subscriptions/plans` - List plans
- `GET /api/subscriptions/status` - User subscription
- `POST /api/subscriptions/initiate-payment` - Start payment

### Settings ✅
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

---

## 🐛 Quick Debugging

### Problem: Can't login
**Check**: 
- Email format is valid
- Password is at least 8 characters
- Backend is running (check health endpoint)

### Problem: 401 Unauthorized
**Check**:
- Token is stored after login (check console logs)
- Token is sent with API requests (check network tab)

### Problem: Empty home screen
**Expected**: No transactions yet! This is normal for new accounts.

### Problem: App redirects to auth after reload
**Check**:
- Token is persisted in storage
- `fetchUser()` is called on app mount
- Auth guard logic in `_layout.tsx`

---

## 📊 Backend Status

**URL**: `https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev`

**Health Check**: `GET /api/health`

**Status**: ✅ **LIVE AND READY**

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Signup completes without email verification
2. ✅ Login works immediately after signup
3. ✅ Home screen loads (even if empty)
4. ✅ Profile shows "Account Active (Testing Mode)"
5. ✅ Logout clears session properly
6. ✅ Session persists after app reload

---

**Need Help?** Check `TESTING_INSTRUCTIONS.md` for detailed testing guide.

**Last Updated**: ${new Date().toISOString()}
