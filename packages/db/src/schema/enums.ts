import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Domain enums.
 *
 * These were free-text strings in the legacy Supabase schema, which allowed
 * typos to reach the database and silently break status filtering. Encoding
 * them as Postgres enums makes an invalid value a write error instead.
 */

/**
 * Roles, in ascending order of privilege.
 *
 * The old set was customer / staff / admin, where `staff` was a single bucket
 * covering everyone who was not a customer — a support agent and a dispatcher
 * held identical access. It is replaced by the three roles the business
 * actually distinguishes, plus a super admin that is the only role permitted
 * to change other people's roles.
 *
 * What each role may do is not encoded here. It lives in ROLE_PERMISSIONS in
 * @umzugplus/core, so a capability can be moved between roles without a
 * database migration.
 */
export const userRoleEnum = pgEnum("user_role", [
  "customer",
  "customer_service",
  "operator",
  "admin",
  "super_admin",
]);

export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);

export const serviceTypeEnum = pgEnum("service_type", [
  "moving",
  "disposal",
  "cleaning",
]);

export const customerTypeEnum = pgEnum("customer_type", ["private", "business"]);

export const calculationMethodEnum = pgEnum("calculation_method", [
  "area",
  "items",
]);

/**
 * Order lifecycle. Transitions are enforced in the service layer
 * (see `orders.state-machine.ts`), not just by this type.
 */
export const orderStatusEnum = pgEnum("order_status", [
  "quoted",
  "confirmed",
  "cancelled",
  "completed",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const complaintAuthorEnum = pgEnum("complaint_author", [
  "customer",
  "staff",
]);

export const discountKindEnum = pgEnum("discount_kind", ["percentage", "fixed"]);

export const catalogKindEnum = pgEnum("catalog_kind", ["furniture", "cleaning"]);
