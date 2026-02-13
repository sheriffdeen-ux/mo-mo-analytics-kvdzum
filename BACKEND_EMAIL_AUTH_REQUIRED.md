
# 🚨 URGENT: Email Authentication Implementation Required

## 📋 Executive Summary

**Problem**: The frontend has been updated to use **email authentication with OTP**, but the backend only supports **phone authentication**. This is causing authentication failures.

**Impact**: Users cannot sign up or log in because the email OTP endpoints don't exist.

**Priority**: 🔴 **CRITICAL** - App is non-functional until this is implemented

**Estimated Time**: 2-3 hours

---

## 🎯 Current Situation

### Frontend Status (✅ Complete)
The frontend (`app/auth.tsx`) is calling these endpoints:
- `POST /api/auth/email/send-otp`
- `POST /api/auth/email/verify-otp`
- `POST /api/auth/email/resend-otp`

### Backend Status (❌ Missing)
The backend only has these endpoints:
- `POST /api/phone/send-otp`
- `POST /api/phone/verify-otp`
- `POST /api/phone/resend-otp`

### Result
**All authentication attempts fail with 404 Not Found**

---

## 📝 Required Implementation

### 1. Database Changes

#### A. Add Email Column to User Table
```sql
-- Migration: Add email support to user_extended table
ALTER TABLE user_extended 
ADD COLUMN email TEXT UNIQUE;

CREATE INDEX idx_user_extended_email ON user_extended(email);
```

#### B. Modify OTP Table to Support Email
The existing `otp_verifications` table can be reused by storing email addresses in the `phoneNumber` field, or create a new table:

**Option 1: Reuse existing table** (Recommended - faster)
```sql
-- No changes needed, just use phoneNumber field for email
-- Add comment for clarity
COMMENT ON COLUMN otp_verifications.phone_number IS 'Stores phone number or email address';
```

**Option 2: Create dedicated table**
```sql
CREATE TABLE email_otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL, -- hashed with SHA-256
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_otp_email ON email_otp_verifications(email);
CREATE INDEX idx_email_otp_expires ON email_otp_verifications(expires_at);
```

---

### 2. Email Service Integration

Add email sending capability (choose one):

#### Option A: Console Logging (For Testing)
```typescript
// backend/src/utils/email-service.ts
export async function sendOTPViaEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n========================================`);
    console.log(`[EMAIL OTP] Sending to: ${email}`);
    console.log(`[EMAIL OTP] Code: ${otpCode}`);
    console.log(`========================================\n`);
    
    // TODO: Replace with actual email service in production
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

#### Option B: SendGrid (Production)
```bash
npm install @sendgrid/mail
```

```typescript
// backend/src/utils/email-service.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendOTPViaEmail(email: string, otpCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sgMail.send({
      to: email,
      from: 'noreply@momoanalytics.com', // Use your verified sender
      subject: 'Your MoMo Analytics Verification Code',
      text: `Your verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Verification Code</h2>
          <p>Your MoMo Analytics verification code is:</p>
          <h1 style="color: #007AFF; font-size: 32px; letter-spacing: 5px;">${otpCode}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[Email Service] Failed to send:', error);
    return { success: false, error: error.message };
  }
}
```

---

### 3. Implement Email OTP Endpoints

Add these three endpoints to `backend/src/routes/auth.ts`:

```typescript
// Add at the top of the file
import { sendOTPViaEmail } from "../utils/email-service.js";

// Email OTP rate limiting
const emailOtpRateLimiter = new Map<string, { count: number; resetTime: number }>();

function checkEmailOTPRateLimit(email: string): boolean {
  const now = Date.now();
  const limit = emailOtpRateLimiter.get(email);

  if (!limit || now > limit.resetTime) {
    emailOtpRateLimiter.set(email, {
      count: 1,
      resetTime: now + 60 * 60 * 1000, // 1 hour
    });
    return true;
  }

  if (limit.count < 3) {
    limit.count++;
    return true;
  }

  return false;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// ENDPOINT 1: Send Email OTP
// ============================================
export function registerAuthRoutes(app: App, fastify: FastifyInstance) {
  fastify.post("/api/auth/email/send-otp", async (request: FastifyRequest) => {
    const body = request.body as { 
      email: string; 
      fullName: string; 
      phoneNumber?: string 
    };

    app.logger.info({ email: body.email }, "Sending email OTP");

    try {
      // Validate email
      if (!validateEmail(body.email)) {
        return { success: false, error: "Invalid email format" };
      }

      if (!body.fullName || body.fullName.trim().length === 0) {
        return { success: false, error: "Full name is required" };
      }

      const normalizedEmail = body.email.toLowerCase().trim();

      // Check rate limit
      if (!checkEmailOTPRateLimit(normalizedEmail)) {
        return {
          success: false,
          error: "Too many OTP requests. Please try again in 1 hour.",
        };
      }

      // Generate OTP
      const otpCode = generateOTPCode();
      const hashedOTP = hashOTPCode(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP (reuse phoneNumber field for email)
      await app.db.insert(schema.otpVerifications).values({
        phoneNumber: normalizedEmail, // Store email in phoneNumber field
        otpCode: hashedOTP,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      // Send OTP via email
      const emailResult = await sendOTPViaEmail(normalizedEmail, otpCode);

      if (!emailResult.success) {
        app.logger.error({ email: normalizedEmail, error: emailResult.error }, "Failed to send OTP email");
        return {
          success: false,
          error: emailResult.error || "Failed to send OTP. Please try again.",
        };
      }

      app.logger.info({ email: normalizedEmail }, "Email OTP sent successfully");

      return {
        success: true,
        expiresIn: 600, // 10 minutes
      };
    } catch (error) {
      app.logger.error({ err: error, email: body.email }, "Failed to send email OTP");
      throw error;
    }
  });

  // ============================================
  // ENDPOINT 2: Verify Email OTP
  // ============================================
  fastify.post("/api/auth/email/verify-otp", async (request: FastifyRequest) => {
    const body = request.body as {
      email: string;
      otpCode: string;
      fullName: string;
      phoneNumber?: string;
      deviceId: string;
    };

    app.logger.info({ email: body.email }, "Verifying email OTP");

    try {
      // Validate inputs
      if (!validateEmail(body.email)) {
        return { success: false, error: "Invalid email format" };
      }

      if (!/^\d{6}$/.test(body.otpCode)) {
        return { success: false, error: "OTP must be 6 digits" };
      }

      if (!body.fullName || body.fullName.trim().length === 0) {
        return { success: false, error: "Full name is required" };
      }

      const normalizedEmail = body.email.toLowerCase().trim();

      // Find OTP record
      const [otpRecord] = await app.db
        .select()
        .from(schema.otpVerifications)
        .where(eq(schema.otpVerifications.phoneNumber, normalizedEmail))
        .orderBy(schema.otpVerifications.createdAt)
        .limit(1);

      if (!otpRecord) {
        return { success: false, error: "OTP not found or expired" };
      }

      // Check expiry
      if (new Date() > otpRecord.expiresAt) {
        return { success: false, error: "OTP has expired" };
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        return {
          success: false,
          error: "Maximum OTP attempts exceeded. Request a new OTP.",
        };
      }

      // Verify OTP
      if (!verifyOTPCode(body.otpCode, otpRecord.otpCode)) {
        // Increment attempts
        await app.db
          .update(schema.otpVerifications)
          .set({ attempts: otpRecord.attempts + 1 })
          .where(eq(schema.otpVerifications.id, otpRecord.id));

        return { success: false, error: "Invalid OTP code" };
      }

      // Mark OTP as verified
      await app.db
        .update(schema.otpVerifications)
        .set({ verified: true })
        .where(eq(schema.otpVerifications.id, otpRecord.id));

      // Check if user exists by email
      // First check if email column exists, if not use phoneNumber
      let user = await app.db
        .select()
        .from(schema.userExtended)
        .where(eq(schema.userExtended.phoneNumber, normalizedEmail));

      if (user.length === 0) {
        // Create new user with trial
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days

        const [newUser] = await app.db
          .insert(schema.userExtended)
          .values({
            userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fullName: body.fullName.trim(),
            phoneNumber: body.phoneNumber || normalizedEmail,
            // email: normalizedEmail, // Uncomment when email column is added
            subscriptionStatus: "trial",
            trialEndDate,
          })
          .returning();

        user = [newUser];
        app.logger.info({ userId: newUser.userId }, "New user created via email");
      }

      const userData = user[0];

      // Register device
      if (body.deviceId) {
        const existingDevice = await app.db
          .select()
          .from(schema.deviceRegistrations)
          .where(eq(schema.deviceRegistrations.deviceId, body.deviceId));

        if (existingDevice.length === 0) {
          await app.db.insert(schema.deviceRegistrations).values({
            userId: userData.userId,
            deviceId: body.deviceId,
          });
        }
      }

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || "momo-analytics-secret-key-change-in-production";
      const accessToken = jwt.sign(
        {
          userId: userData.userId,
          email: normalizedEmail,
          phoneNumber: userData.phoneNumber,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      app.logger.info({ userId: userData.userId, email: normalizedEmail }, "User authenticated via email OTP");

      return {
        success: true,
        user: {
          id: userData.userId,
          fullName: userData.fullName,
          phoneNumber: userData.phoneNumber,
          email: normalizedEmail,
          subscriptionStatus: userData.subscriptionStatus,
          trialEndDate: userData.trialEndDate,
        },
        accessToken,
        expiresIn: 2592000, // 30 days in seconds
        tokenType: "Bearer",
      };
    } catch (error) {
      app.logger.error({ err: error, email: body.email }, "Failed to verify email OTP");
      throw error;
    }
  });

  // ============================================
  // ENDPOINT 3: Resend Email OTP
  // ============================================
  fastify.post("/api/auth/email/resend-otp", async (request: FastifyRequest) => {
    const body = request.body as { email: string };

    app.logger.info({ email: body.email }, "Resending email OTP");

    try {
      if (!validateEmail(body.email)) {
        return { success: false, error: "Invalid email format" };
      }

      const normalizedEmail = body.email.toLowerCase().trim();

      // Check rate limit
      if (!checkEmailOTPRateLimit(normalizedEmail)) {
        return {
          success: false,
          error: "Too many OTP requests. Please try again in 1 hour.",
        };
      }

      // Generate new OTP
      const otpCode = generateOTPCode();
      const hashedOTP = hashOTPCode(otpCode);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await app.db.insert(schema.otpVerifications).values({
        phoneNumber: normalizedEmail,
        otpCode: hashedOTP,
        expiresAt,
        verified: false,
        attempts: 0,
      });

      // Send OTP
      const emailResult = await sendOTPViaEmail(normalizedEmail, otpCode);

      if (!emailResult.success) {
        app.logger.error({ email: normalizedEmail, error: emailResult.error }, "Failed to resend OTP email");
        return {
          success: false,
          error: emailResult.error || "Failed to send OTP. Please try again.",
        };
      }

      app.logger.info({ email: normalizedEmail }, "Email OTP resent successfully");

      return {
        success: true,
        expiresIn: 600,
      };
    } catch (error) {
      app.logger.error({ err: error, email: body.email }, "Failed to resend email OTP");
      throw error;
    }
  });

  // ... existing phone OTP endpoints remain unchanged ...
}
```

---

### 4. Add GET /api/user/me Endpoint

Add this to `backend/src/routes/user.ts`:

```typescript
import jwt from "jsonwebtoken";

export function registerUserRoutes(app: App, fastify: FastifyInstance) {
  // GET /api/user/me - Get current user profile
  fastify.get("/api/user/me", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Extract user from JWT (set by middleware)
      const user = (request as any).user;
      
      if (!user || !user.userId) {
        return reply.code(401).send({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }
      
      // Fetch user data from database
      const [userData] = await app.db
        .select()
        .from(schema.userExtended)
        .where(eq(schema.userExtended.userId, user.userId));
      
      if (!userData) {
        return reply.code(404).send({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      return {
        id: userData.userId,
        fullName: userData.fullName,
        email: user.email || userData.phoneNumber,
        phoneNumber: userData.phoneNumber,
        subscriptionStatus: userData.subscriptionStatus,
        trialEndDate: userData.trialEndDate,
        currentPlanId: userData.currentPlanId,
        smsConsentGiven: userData.smsConsentGiven,
        smsAutoDetectionEnabled: userData.smsAutoDetectionEnabled,
      };
    } catch (error) {
      app.logger.error({ err: error }, "Failed to fetch user profile");
      throw error;
    }
  });

  // ... existing user endpoints ...
}
```

---

### 5. Update JWT Middleware

Update `backend/src/index.ts` to include `/api/user/me` in protected routes:

```typescript
const protectedRoutes = [
  '/api/user/me',        // Add this line
  '/api/user/profile',   // Add this line
  '/api/transactions',
  '/api/settings',
  '/api/subscriptions/status',
  '/api/subscriptions/initiate-payment',
  '/api/subscriptions/cancel',
  '/api/analytics',
  '/api/register-device',
  '/api/admin',
];
```

---

## 🧪 Testing

### Test Email OTP Flow

```bash
# 1. Send OTP
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567"
  }'

# Expected: { "success": true, "expiresIn": 600 }

# 2. Check console logs for OTP code (if using console logging)

# 3. Verify OTP
curl -X POST https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/auth/email/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otpCode": "123456",
    "fullName": "John Doe",
    "phoneNumber": "+233241234567",
    "deviceId": "device_123"
  }'

# Expected: { "success": true, "user": {...}, "accessToken": "..." }

# 4. Test /api/user/me
curl -X GET https://hnexc629pvxz9z3jnx9fzbhvzsfhq7vg.app.specular.dev/api/user/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Expected: { "id": "...", "fullName": "...", "email": "...", ... }
```

---

## 📊 Implementation Checklist

- [ ] Add email column to `user_extended` table
- [ ] Create `email-service.ts` utility
- [ ] Implement `POST /api/auth/email/send-otp`
- [ ] Implement `POST /api/auth/email/verify-otp`
- [ ] Implement `POST /api/auth/email/resend-otp`
- [ ] Implement `GET /api/user/me`
- [ ] Add JWT token generation in verify-otp
- [ ] Update JWT middleware to include `/api/user/me`
- [ ] Test email OTP flow end-to-end
- [ ] Test session persistence
- [ ] Deploy to production

---

## ⏱️ Time Estimate

- **Database migration**: 15 minutes
- **Email service setup**: 30 minutes
- **Email OTP endpoints**: 1 hour
- **GET /api/user/me endpoint**: 15 minutes
- **Testing**: 30 minutes
- **Total**: 2-3 hours

---

## 📁 Files to Create/Modify

### New Files
1. `backend/src/utils/email-service.ts` - Email sending utility
2. `backend/drizzle/migrations/YYYYMMDDHHMMSS_add_email_auth.sql` - Database migration

### Modified Files
1. `backend/src/db/schema.ts` - Add email column
2. `backend/src/routes/auth.ts` - Add email OTP endpoints
3. `backend/src/routes/user.ts` - Add GET /api/user/me
4. `backend/src/index.ts` - Update JWT middleware
5. `backend/package.json` - Add dependencies (if using SendGrid)

---

## 🔐 Security Notes

1. **OTP Security**:
   - Hash OTP codes (SHA-256) before storing
   - 10-minute expiration
   - Max 3 attempts per OTP
   - Rate limit: 3 requests per hour per email

2. **JWT Security**:
   - Use strong secret (min 32 characters)
   - 30-day expiration
   - Include userId and email in payload

3. **Email Validation**:
   - Validate format with regex
   - Normalize (lowercase, trim)
   - Consider blocking disposable email domains

---

## 🚀 Deployment Steps

1. Run database migration
2. Deploy backend code
3. Set environment variables (JWT_SECRET, SENDGRID_API_KEY)
4. Test with frontend app
5. Monitor logs for errors

---

## 📞 Sample Test User

**Email**: test@example.com
**Full Name**: John Doe
**Phone**: +233241234567 (optional)
**OTP**: Check console logs or email inbox

---

## ✅ Success Criteria

After implementation:
- ✅ Users can sign up with email + OTP
- ✅ Users can log in with email + OTP
- ✅ JWT tokens are generated and returned
- ✅ Protected endpoints require valid JWT
- ✅ Session persists across app restarts
- ✅ `/api/user/me` returns user profile

---

**Status**: ⏳ **PENDING IMPLEMENTATION**

**Priority**: 🔴 **CRITICAL**

**Blocking**: Frontend cannot function until this is complete
