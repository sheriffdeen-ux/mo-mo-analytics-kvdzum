ALTER TABLE "user_settings" ADD COLUMN "daily_spending_limit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "alerts_enabled" boolean DEFAULT true;