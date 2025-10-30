CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cc_campaign_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"preheader" text,
	"from_name" text,
	"from_email" text,
	"sent_at" timestamp,
	"status" text NOT NULL,
	"sends" integer DEFAULT 0,
	"opens" integer DEFAULT 0,
	"opens_unique" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"clicks_unique" integer DEFAULT 0,
	"bounces" integer DEFAULT 0,
	"optouts" integer DEFAULT 0,
	"open_rate" numeric(5, 4),
	"click_rate" numeric(5, 4),
	"first_seen_at" timestamp DEFAULT now(),
	"last_updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insights_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"campaigns_analyzed" integer DEFAULT 0,
	"new_campaigns_since_last" integer DEFAULT 0,
	"insights_data" text,
	"podcast_url" text,
	"transcript_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights_reports" ADD CONSTRAINT "insights_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_campaign_idx" ON "campaigns" USING btree ("user_id","cc_campaign_id");