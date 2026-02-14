import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  decimal,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Extend user table with additional fields
export const userExtended = pgTable("user_extended", {
  userId: text("user_id").primaryKey(),
  fullName: text("full_name"),
  email: text("email").unique().notNull(), // Email for authentication
  passwordHash: text("password_hash"), // Hashed password
  passwordSalt: text("password_salt"), // Salt for password hashing
  businessName: text("business_name"),
  phoneNumber: text("phone_number"), // Manual entry by user / profile only
  deviceFingerprint: text("device_fingerprint"),
  lastLoginDevice: text("last_login_device"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  subscriptionStatus: text("subscription_status", {
    enum: ["free", "trial", "pro", "business"],
  })
    .default("trial")
    .notNull(),
  trialEndDate: timestamp("trial_end_date", { withTimezone: true }),
  currentPlanId: text("current_plan_id"),
  alertSensitivity: decimal("alert_sensitivity", { precision: 3, scale: 2 })
    .default("1.0")
    .notNull(),
  confirmedSafeCount: integer("confirmed_safe_count").default(0),
  reportedFraudCount: integer("reported_fraud_count").default(0),
  smsConsentGiven: boolean("sms_consent_given").default(false),
  smsAutoDetectionEnabled: boolean("sms_auto_detection_enabled").default(false),
  pin: text("pin"), // Hashed PIN for new device verification
  requiresPinOnNewDevice: boolean("requires_pin_on_new_device").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("idx_user_extended_email").on(table.email),
  index("idx_user_extended_user_id").on(table.userId),
]);

// Subscriptions table
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    planId: text("plan_id", {
      enum: [
        "free",
        "pro_weekly",
        "pro_monthly",
        "pro_yearly",
        "business_weekly",
        "business_monthly",
      ],
    }).notNull(),
    status: text("status", {
      enum: ["active", "cancelled", "expired"],
    })
      .default("active")
      .notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("GHS"),
    paystackReference: text("paystack_reference").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_subscriptions_user_id").on(table.userId),
    index("idx_subscriptions_status").on(table.status),
  ]
);

// OTP Verifications table
export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneNumber: text("phone_number").notNull(),
    otpCode: text("otp_code").notNull(), // hashed
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verified: boolean("verified").default(false),
    attempts: integer("attempts").default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_otp_verifications_phone").on(table.phoneNumber),
    index("idx_otp_verifications_expires_at").on(table.expiresAt),
  ]
);

// Payment Transactions table
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    subscriptionId: uuid("subscription_id"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").default("GHS"),
    paystackReference: text("paystack_reference").notNull().unique(),
    status: text("status", {
      enum: ["pending", "success", "failed"],
    })
      .default("pending")
      .notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_payment_transactions_user_id").on(table.userId),
    index("idx_payment_transactions_paystack_ref").on(
      table.paystackReference
    ),
  ]
);

// Transactions table - stores all MoMo transactions
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    rawSms: text("raw_sms").notNull(),
    provider: text("provider", {
      enum: ["MTN", "Vodafone", "AirtelTigo"],
    }).notNull(),
    transactionType: text("transaction_type", {
      enum: ["sent", "received", "withdrawal", "deposit"],
    }).notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    recipient: text("recipient"),
    balance: decimal("balance", { precision: 10, scale: 2 }),
    transactionDate: timestamp("transaction_date", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    riskScore: integer("risk_score").notNull(),
    riskLevel: text("risk_level", {
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    }).notNull(),
    riskReasons: jsonb("risk_reasons").$type<string[]>(),
    isBlocked: boolean("is_blocked").default(false),
    isFraudReported: boolean("is_fraud_reported").default(false),
  },
  (table) => [
    index("idx_transactions_user_id").on(table.userId),
    index("idx_transactions_created_at").on(table.createdAt),
    index("idx_transactions_risk_level").on(table.riskLevel),
  ]
);

// User settings table - stores user-defined limits and merchant lists
export const userSettings = pgTable(
  "user_settings",
  {
    userId: text("user_id").primaryKey(),
    dailyLimit: decimal("daily_limit", { precision: 10, scale: 2 }).default(
      "2000"
    ),
    blockedMerchants: jsonb("blocked_merchants").$type<string[]>().default(
      []
    ),
    trustedMerchants: jsonb("trusted_merchants").$type<string[]>().default(
      []
    ),
    smsReadPreference: text("sms_read_preference", {
      enum: ["all", "momo_only"],
    })
      .default("momo_only")
      .notNull(),
    notificationPreferences: jsonb("notification_preferences")
      .$type<Record<string, any>>()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("idx_user_settings_user_id").on(table.userId)]
);

// Device registrations table - stores FCM tokens for push notifications
export const deviceRegistrations = pgTable(
  "device_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    deviceId: text("device_id").notNull().unique(),
    fcmToken: text("fcm_token"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_device_registrations_user_id").on(table.userId),
    index("idx_device_registrations_device_id").on(table.deviceId),
  ]
);

// Device trust log table - tracks device trust levels and behavioral verification
export const deviceTrustLog = pgTable(
  "device_trust_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    deviceFingerprint: text("device_fingerprint").notNull(),
    trustLevel: text("trust_level", {
      enum: ["trusted", "suspicious", "blocked"],
    })
      .default("suspicious")
      .notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    loginAttempts: integer("login_attempts").default(0),
    smsVerificationCount: integer("sms_verification_count").default(0),
    transactionPatternScore: decimal("transaction_pattern_score", {
      precision: 5,
      scale: 2,
    })
      .default("0"),
  },
  (table) => [
    index("idx_device_trust_log_user_id").on(table.userId),
    index("idx_device_trust_log_device_fp").on(table.deviceFingerprint),
  ]
);

// SMS scan log table - logs SMS scanning activity for transparency
export const smsScanLog = pgTable(
  "sms_scan_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    deviceFingerprint: text("device_fingerprint").notNull(),
    smsCount: integer("sms_count").notNull(),
    momoSmsCount: integer("momo_sms_count").notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_sms_scan_log_user_id").on(table.userId),
    index("idx_sms_scan_log_scanned_at").on(table.scannedAt),
  ]
);

// Audit log table - comprehensive audit trail for security events
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, any>>(),
    ipAddress: text("ip_address"),
    deviceFingerprint: text("device_fingerprint"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_audit_log_user_id").on(table.userId),
    index("idx_audit_log_created_at").on(table.createdAt),
  ]
);

// Relations for transactions
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one({
    fields: [transactions.userId],
    references: ["id"],
  } as any),
}));

// Relations for device registrations
export const deviceRegistrationsRelations = relations(
  deviceRegistrations,
  ({ one }) => ({
    user: one({
      fields: [deviceRegistrations.userId],
      references: ["id"],
    } as any),
  })
);

// Relations for user settings
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one({
    fields: [userSettings.userId],
    references: ["id"],
  } as any),
}));

// Relations for user extended
export const userExtendedRelations = relations(userExtended, ({ one, many }) => ({
  subscriptions: many(subscriptions),
  paymentTransactions: many(paymentTransactions),
}));

// Relations for subscriptions
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(userExtended, {
    fields: [subscriptions.userId],
    references: [userExtended.userId],
  }),
}));

// Relations for payment transactions
export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    user: one(userExtended, {
      fields: [paymentTransactions.userId],
      references: [userExtended.userId],
    }),
    subscription: one(subscriptions, {
      fields: [paymentTransactions.subscriptionId],
      references: [subscriptions.id],
    }),
  })
);

// Relations for device trust log
export const deviceTrustLogRelations = relations(
  deviceTrustLog,
  ({ one }) => ({
    user: one({
      fields: [deviceTrustLog.userId],
      references: ["id"],
    } as any),
  })
);

// Relations for SMS scan log
export const smsScanLogRelations = relations(
  smsScanLog,
  ({ one }) => ({
    user: one({
      fields: [smsScanLog.userId],
      references: ["id"],
    } as any),
  })
);

// Relations for audit log
export const auditLogRelations = relations(
  auditLog,
  ({ one }) => ({
    user: one({
      fields: [auditLog.userId],
      references: ["id"],
    } as any),
  })
);
