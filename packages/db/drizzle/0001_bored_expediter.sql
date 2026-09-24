CREATE TABLE "knowledge_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text DEFAULT 'de' NOT NULL,
	"intent" text NOT NULL,
	"keywords" jsonb NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid,
	"question" text NOT NULL,
	"locale" text NOT NULL,
	"best_score" numeric(4, 3),
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_thread_id_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."chat_threads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_locale_intent_idx" ON "knowledge_entries" USING btree ("locale","intent");--> statement-breakpoint
CREATE INDEX "knowledge_active_idx" ON "knowledge_entries" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "knowledge_gaps_created_idx" ON "knowledge_gaps" USING btree ("created_at");