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
