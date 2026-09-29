-- Read state for the customer dashboard's Messages screen: staff replies newer
-- than this are counted as unread. Nullable, so existing conversations start
-- with every staff reply unread rather than needing a backfill.
ALTER TABLE "chat_threads" ADD COLUMN "customer_read_at" timestamp with time zone;