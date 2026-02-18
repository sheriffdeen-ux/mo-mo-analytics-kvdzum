ALTER TABLE "transactions" ADD COLUMN "import_source" text DEFAULT 'chatbot';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "imported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "sms_import_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "last_sms_import_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "total_sms_imports" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "idx_transactions_import_source" ON "transactions" USING btree ("import_source");