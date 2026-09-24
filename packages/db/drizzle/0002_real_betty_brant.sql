CREATE TABLE "content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" text NOT NULL,
	"slot" text NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"value" text NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"label" text NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"group" text DEFAULT 'theme' NOT NULL,
	"kind" text DEFAULT 'text' NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX "content_blocks_slot_locale_idx" ON "content_blocks" USING btree ("section","slot","locale");--> statement-breakpoint
CREATE INDEX "content_blocks_section_idx" ON "content_blocks" USING btree ("section","sort_order");--> statement-breakpoint
CREATE INDEX "site_settings_group_idx" ON "site_settings" USING btree ("group","sort_order");