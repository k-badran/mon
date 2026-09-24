-- Widens `user_role` from customer/staff/admin to the five-role model.
--
-- Postgres cannot remove a value from an enum, and `ALTER TYPE ... ADD VALUE`
-- cannot run inside the same transaction that then uses the new value. So the
-- type is rebuilt rather than patched: a new enum is created with the full set,
-- the column is cast across, and the old type is dropped.
--
-- `staff` maps to `operator`. That is the safer of the two readings — the old
-- bucket was used for dispatch as well as support, and demoting a dispatcher to
-- customer_service would take away order-editing they rely on. Anyone who
-- should only answer messages can be moved down afterwards from the users
-- screen, which is a smaller correction than discovering the fleet cannot be
-- scheduled.

CREATE TYPE "user_role_new" AS ENUM (
  'customer',
  'customer_service',
  'operator',
  'admin',
  'super_admin'
);

-- The default has to go before the cast: Postgres will not re-interpret an
-- existing default expression against a different type.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "user_role_new"
  USING (
    CASE "role"::text
      WHEN 'staff' THEN 'operator'
      ELSE "role"::text
    END
  )::"user_role_new";

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer';

DROP TYPE "user_role";
ALTER TYPE "user_role_new" RENAME TO "user_role";
