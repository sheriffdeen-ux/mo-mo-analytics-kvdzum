ALTER TABLE "user_extended" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "user_extended" ADD COLUMN "password_salt" text;--> statement-breakpoint
CREATE INDEX "idx_user_extended_email" ON "user_extended" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_extended_user_id" ON "user_extended" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "user_extended" ADD CONSTRAINT "user_extended_email_unique" UNIQUE("email");