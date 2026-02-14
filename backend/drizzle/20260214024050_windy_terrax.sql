ALTER TABLE "user_extended" ALTER COLUMN "phone_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "verification_token_expiry" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_user_extended_verification_token" ON "user_extended" USING btree ("verification_token");