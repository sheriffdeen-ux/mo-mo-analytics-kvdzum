CREATE TABLE "financial_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"report_type" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_sent" numeric(10, 2) DEFAULT '0',
	"total_received" numeric(10, 2) DEFAULT '0',
	"transaction_count" integer DEFAULT 0,
	"average_transaction_amount" numeric(10, 2),
	"highest_transaction" numeric(10, 2),
	"lowest_transaction" numeric(10, 2),
	"fraud_detected_count" integer DEFAULT 0,
	"report_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_auto_reply_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"auto_reply_enabled" boolean DEFAULT true,
	"reply_only_no_fraud" boolean DEFAULT true,
	"include_daily_summary" boolean DEFAULT true,
	"include_weekly_summary" boolean DEFAULT false,
	"include_monthly_summary" boolean DEFAULT false,
	"custom_reply_template" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "ai_reply_generated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "ai_reply_content" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "ai_reply_timestamp" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_financial_reports_user_id" ON "financial_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_financial_reports_period" ON "financial_reports" USING btree ("report_type","period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_sms_auto_reply_settings_user_id" ON "sms_auto_reply_settings" USING btree ("user_id");