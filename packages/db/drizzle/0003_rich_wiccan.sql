-- Widens `user_role` from customer/staff/admin to the five-role model.
--
-- Hand-written, replacing what `drizzle-kit generate` produced for this diff.
-- The generated form was:
--
--     ALTER TABLE users ALTER COLUMN role SET DATA TYPE text;
--     DROP TYPE user_role;
--     CREATE TYPE user_role AS ENUM (...five values...);
--     ALTER TABLE users ALTER COLUMN role SET DATA TYPE user_role
--       USING role::user_role;
--
-- which is wrong twice. The cast back has no mapping, so every existing row
-- holding 'staff' — a value the new type does not contain — aborts the
-- migration. And dropping to `text` silently discards the column default,
-- which the generated SQL never restores, leaving new users with a NULL role.
--
-- `staff` maps to `operator`. That is the safer of the two readings — the old
-- bucket was used for dispatch as well as support, and demoting a dispatcher to
-- customer_service would take away order-editing they rely on. Anyone who
-- should only answer messages can be moved down afterwards from the users
-- screen, which is a smaller correction than discovering the fleet cannot be
-- scheduled.
--
-- Postgres cannot remove a value from an enum, and `ALTER TYPE ... ADD VALUE`
-- cannot run in the same transaction that then uses the new value. So the type
-- is rebuilt rather than patched: a new enum is created with the full set, the
-- column is cast across, and the old type is dropped.

CREATE TYPE "user_role_new" AS ENUM (
  'customer',
  'customer_service',
  'operator',
  'admin',
  'super_admin'
);--> statement-breakpoint

-- The default has to go before the cast: Postgres will not re-interpret an
-- existing default expression against a different type.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "user_role_new"
  USING (
    CASE "role"::text
      WHEN 'staff' THEN 'operator'
      ELSE "role"::text
    END
  )::"user_role_new";--> statement-breakpoint

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';--> statement-breakpoint

DROP TYPE "user_role";--> statement-breakpoint
ALTER TYPE "user_role_new" RENAME TO "user_role";
