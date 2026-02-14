CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"level" text NOT NULL,
	"sms_sent" boolean DEFAULT false,
	"sent_at" timestamp with time zone,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_app_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" uuid NOT NULL,
	"alert_level" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"risk_score" integer,
	"risk_reasons" jsonb,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"action_taken" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recipient_blacklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_identifier" text NOT NULL,
	"blacklist_type" text NOT NULL,
	"user_id" text,
	"reason" text,
	"risk_level" text NOT NULL,
	"reported_count" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipient_blacklist_recipient_identifier_unique" UNIQUE("recipient_identifier")
);
--> statement-breakpoint
CREATE TABLE "risk_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" text NOT NULL,
	"pattern_value" text NOT NULL,
	"risk_weight" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_layers_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"layer_number" integer NOT NULL,
	"layer_name" text NOT NULL,
	"status" text NOT NULL,
	"score" numeric(5, 2),
	"details" jsonb,
	"processing_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending',
	"provider" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_behavior_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"avg_transaction_amount" numeric(10, 2),
	"typical_transaction_times" jsonb,
	"typical_recipients" jsonb,
	"transaction_frequency" numeric(5, 2),
	"last_30_days_pattern" jsonb,
	"anomaly_threshold" numeric(5, 2) DEFAULT '3.0',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer1_sms_raw" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer2_validation_status" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer3_nlp_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer3_scam_keywords" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer4_velocity_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer4_anomaly_detected" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer5_risk_breakdown" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer6_alert_level" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer6_alert_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "layer7_audit_trail" jsonb;--> statement-breakpoint
CREATE INDEX "idx_alerts_transaction_id" ON "alerts" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_level" ON "alerts" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_in_app_alerts_user_id" ON "in_app_alerts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_in_app_alerts_transaction_id" ON "in_app_alerts" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_in_app_alerts_is_read" ON "in_app_alerts" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_recipient_blacklist_user_id" ON "recipient_blacklist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recipient_blacklist_type" ON "recipient_blacklist" USING btree ("blacklist_type");--> statement-breakpoint
CREATE INDEX "idx_risk_patterns_type" ON "risk_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX "idx_risk_patterns_active" ON "risk_patterns" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_security_layers_log_transaction_id" ON "security_layers_log" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_security_layers_log_user_id" ON "security_layers_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_security_layers_log_layer_number" ON "security_layers_log" USING btree ("layer_number");--> statement-breakpoint
CREATE INDEX "idx_sms_logs_phone" ON "sms_logs" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_sms_logs_status" ON "sms_logs" USING btree ("status");