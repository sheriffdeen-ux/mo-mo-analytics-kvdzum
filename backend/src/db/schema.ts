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
  emailVerified: boolean("email_verified").default(false), // Email verification status
  verificationToken: text("verification_token"), // UUID token for email verification
  verificationTokenExpiry: timestamp("verification_token_expiry", { withTimezone: true }), // Token expiry time
  passwordHash: text("password_hash"), // Hashed password
  passwordSalt: text("password_salt"), // Salt for password hashing
  businessName: text("business_name"),
  phoneNumber: text("phone_number").notNull(), // Phone number (required)
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
  index("idx_user_extended_verification_token").on(table.verificationToken),
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
    aiReplyGenerated: boolean("ai_reply_generated").default(false), // AI SMS reply generated
    aiReplyContent: text("ai_reply_content"), // Generated SMS reply content
    aiReplyTimestamp: timestamp("ai_reply_timestamp", { withTimezone: true }), // When reply was generated
    // 7-Layer Security Framework fields
    layer1SmsRaw: text("layer1_sms_raw"), // Raw SMS capture data
    layer2ValidationStatus: text("layer2_validation_status"), // PASS/FAIL
    layer3NlpScore: decimal("layer3_nlp_score", { precision: 5, scale: 2 }), // NLP pattern score
    layer3ScamKeywords: jsonb("layer3_scam_keywords").$type<string[]>(), // Detected keywords
    layer4VelocityScore: decimal("layer4_velocity_score", { precision: 5, scale: 2 }), // Velocity score
    layer4AnomalyDetected: boolean("layer4_anomaly_detected").default(false), // Behavioral anomaly
    layer5RiskBreakdown: jsonb("layer5_risk_breakdown").$type<Record<string, any>>(), // Risk details
    layer6AlertLevel: text("layer6_alert_level"), // CRITICAL/HIGH/MEDIUM/LOW
    layer6AlertSentAt: timestamp("layer6_alert_sent_at", { withTimezone: true }), // Alert timestamp
    layer7AuditTrail: jsonb("layer7_audit_trail").$type<Record<string, any>>(), // Audit trail
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

// SMS Auto-Reply Settings table
export const smsAutoReplySettings = pgTable(
  "sms_auto_reply_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    autoReplyEnabled: boolean("auto_reply_enabled").default(true),
    replyOnlyNoFraud: boolean("reply_only_no_fraud").default(true), // Only reply if no fraud detected
    includeDailySummary: boolean("include_daily_summary").default(true),
    includeWeeklySummary: boolean("include_weekly_summary").default(false),
    includeMonthlySummary: boolean("include_monthly_summary").default(false),
    customReplyTemplate: text("custom_reply_template"), // User custom template
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_sms_auto_reply_settings_user_id").on(table.userId),
  ]
);

// Financial Reports table
export const financialReports = pgTable(
  "financial_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    reportType: text("report_type", {
      enum: ["daily", "weekly", "monthly"],
    }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    totalSent: decimal("total_sent", { precision: 10, scale: 2 }).default("0"),
    totalReceived: decimal("total_received", { precision: 10, scale: 2 }).default("0"),
    transactionCount: integer("transaction_count").default(0),
    averageTransactionAmount: decimal("average_transaction_amount", { precision: 10, scale: 2 }),
    highestTransaction: decimal("highest_transaction", { precision: 10, scale: 2 }),
    lowestTransaction: decimal("lowest_transaction", { precision: 10, scale: 2 }),
    fraudDetectedCount: integer("fraud_detected_count").default(0),
    reportData: jsonb("report_data").$type<Record<string, any>>(), // Detailed breakdown
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_financial_reports_user_id").on(table.userId),
    index("idx_financial_reports_period").on(table.reportType, table.periodStart, table.periodEnd),
  ]
);

// Alerts table
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").notNull(),
    level: text("level", {
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    }).notNull(),
    smsSent: boolean("sms_sent").default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    status: text("status", {
      enum: ["pending", "sent", "delivered", "failed"],
    }).default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_alerts_transaction_id").on(table.transactionId),
    index("idx_alerts_level").on(table.level),
  ]
);

// SMS Logs table
export const smsLogs = pgTable(
  "sms_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    message: text("message").notNull(),
    status: text("status", {
      enum: ["pending", "sent", "delivered", "failed"],
    }).default("pending"),
    provider: text("provider", {
      enum: ["MTN", "Vodafone", "AirtelTigo"],
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_sms_logs_phone").on(table.phone),
    index("idx_sms_logs_status").on(table.status),
  ]
);

// Security Layers Log table
export const securityLayersLog = pgTable(
  "security_layers_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").notNull(),
    userId: text("user_id").notNull(),
    layerNumber: integer("layer_number").notNull(), // 1-7
    layerName: text("layer_name").notNull(),
    status: text("status", {
      enum: ["PASS", "FAIL", "WARNING"],
    }).notNull(),
    score: decimal("score", { precision: 5, scale: 2 }),
    details: jsonb("details").$type<Record<string, any>>(),
    processingTimeMs: integer("processing_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_security_layers_log_transaction_id").on(table.transactionId),
    index("idx_security_layers_log_user_id").on(table.userId),
    index("idx_security_layers_log_layer_number").on(table.layerNumber),
  ]
);

// Risk Patterns table
export const riskPatterns = pgTable(
  "risk_patterns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patternType: text("pattern_type", {
      enum: ["SCAM_KEYWORD", "TIME_PATTERN", "AMOUNT_PATTERN", "VELOCITY", "LOCATION"],
    }).notNull(),
    patternValue: text("pattern_value").notNull(),
    riskWeight: decimal("risk_weight", { precision: 5, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_risk_patterns_type").on(table.patternType),
    index("idx_risk_patterns_active").on(table.isActive),
  ]
);

// User Behavior Profile table
export const userBehaviorProfile = pgTable(
  "user_behavior_profile",
  {
    userId: text("user_id").primaryKey(),
    avgTransactionAmount: decimal("avg_transaction_amount", { precision: 10, scale: 2 }),
    typicalTransactionTimes: jsonb("typical_transaction_times").$type<number[]>(), // Hours (0-23)
    typicalRecipients: jsonb("typical_recipients").$type<string[]>(),
    transactionFrequency: decimal("transaction_frequency", { precision: 5, scale: 2 }), // Avg per day
    last30DaysPattern: jsonb("last_30_days_pattern").$type<Record<string, any>>(),
    anomalyThreshold: decimal("anomaly_threshold", { precision: 5, scale: 2 }).default("3.0"), // 3x normal
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }
);

// Recipient Blacklist table
export const recipientBlacklist = pgTable(
  "recipient_blacklist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientIdentifier: text("recipient_identifier").notNull().unique(),
    blacklistType: text("blacklist_type", {
      enum: ["GLOBAL", "USER_SPECIFIC"],
    }).notNull(),
    userId: text("user_id"), // NULL for global blacklist
    reason: text("reason"),
    riskLevel: text("risk_level", {
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    }).notNull(),
    reportedCount: integer("reported_count").default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_recipient_blacklist_user_id").on(table.userId),
    index("idx_recipient_blacklist_type").on(table.blacklistType),
  ]
);

// In-App Alerts table
export const inAppAlerts = pgTable(
  "in_app_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    alertLevel: text("alert_level", {
      enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    riskScore: integer("risk_score"),
    riskReasons: jsonb("risk_reasons").$type<string[]>(),
    isRead: boolean("is_read").default(false),
    isDismissed: boolean("is_dismissed").default(false),
    actionTaken: text("action_taken", {
      enum: ["CONFIRMED_SAFE", "BLOCKED", "REPORTED"],
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_in_app_alerts_user_id").on(table.userId),
    index("idx_in_app_alerts_transaction_id").on(table.transactionId),
    index("idx_in_app_alerts_is_read").on(table.isRead),
  ]
);
