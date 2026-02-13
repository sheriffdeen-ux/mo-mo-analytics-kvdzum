CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"details" jsonb,
	"ip_address" text,
	"device_fingerprint" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_trust_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"device_fingerprint" text NOT NULL,
	"trust_level" text DEFAULT 'suspicious' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"login_attempts" integer DEFAULT 0,
	"sms_verification_count" integer DEFAULT 0,
	"transaction_pattern_score" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "sms_scan_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"device_fingerprint" text NOT NULL,
	"sms_count" integer NOT NULL,
	"momo_sms_count" integer NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_extended" DROP CONSTRAINT "user_extended_phone_number_unique";--> statement-breakpoint
ALTER TABLE "user_extended" ALTER COLUMN "full_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_extended" ALTER COLUMN "phone_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "business_name" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "device_fingerprint" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "last_login_device" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "sms_consent_given" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "sms_auto_detection_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "pin" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "requires_pin_on_new_device" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "idx_audit_log_user_id" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_device_trust_log_user_id" ON "device_trust_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_device_trust_log_device_fp" ON "device_trust_log" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_sms_scan_log_user_id" ON "sms_scan_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sms_scan_log_scanned_at" ON "sms_scan_log" USING btree ("scanned_at");