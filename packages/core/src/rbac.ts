/**
 * Roles and permissions.
 *
 * Shared by the API, which enforces them, and the web app, which uses them to
 * decide what to render. Both read the same table, so a screen cannot offer an
 * action the server will refuse — and, more importantly, hiding a control is
 * never mistaken for securing it.
 *
 * ## Why permissions rather than role checks
 *
 * Routes used to ask `requireRole("admin")`. That reads fine until a fourth
 * role arrives and every route has to be revisited to decide whether it is
 * included. A route that asks for a *capability* — "may this caller change
 * pricing?" — keeps working when the roles change around it, and the answer
 * lives in one table instead of being spread across forty route files.
 *
 * ## Why the grants are not in the token
 *
 * The access token carries the role. It does NOT carry the permission set:
 * a token minted before a permission was revoked would otherwise keep the
 * permission until it expired. The API resolves the caller's role to grants on
 * each request, so a change takes effect at once.
 */

export const ROLES = [
  "customer",
  "customer_service",
  "operator",
  "admin",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Rank orders the roles for coarse comparisons — "is this caller at least an
 * operator?" It is NOT the authorisation mechanism: a higher rank does not
 * silently inherit grants, because inheritance by number is how someone ends
 * up with a permission nobody deliberately gave them. Grants are listed
 * explicitly per role below.
 */
export const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  customer_service: 10,
  operator: 20,
  admin: 30,
  super_admin: 40,
};

/** Every capability the system recognises. */
export const PERMISSIONS = [
  // Orders and the work itself
  "orders.read",
  "orders.write",
  "orders.assign",
  "orders.cancel",
  "quotes.read",
  "availability.write",

  // People
  "customers.read",
  "customers.write",

  // Support
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
  "reviews.moderate",

  // Money
  "payments.read",
  "payments.write",
  "pricing.read",
  "pricing.write",
  "discounts.write",

  // The product the business sells and the site that sells it
  "catalog.write",
  "content.write",
  "theme.write",

  // Administration
  "users.read",
  "users.write",
  "roles.write",
  "settings.write",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * What each role may do.
 *
 * Written out in full rather than as "operator = customer_service + extras".
 * The lists repeat, and that is the point: reading one row tells you exactly
 * what that role can do without following a chain, and removing a grant from
 * one role cannot silently remove it from another.
 */
const CUSTOMER_SERVICE: readonly Permission[] = [
  "orders.read",
  "quotes.read",
  "customers.read",
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
];

const OPERATOR: readonly Permission[] = [
  "orders.read",
  "orders.write",
  "orders.assign",
  "orders.cancel",
  "quotes.read",
  "availability.write",
  "customers.read",
  "messages.read",
  "messages.write",
  "complaints.read",
  "complaints.write",
  "reviews.read",
  "reviews.moderate",
  "payments.read",
];

const ADMIN: readonly Permission[] = [
  ...OPERATOR,
  "customers.write",
  "payments.write",
  "pricing.read",
  "pricing.write",
  "discounts.write",
  "catalog.write",
  "content.write",
  "theme.write",
  "users.read",
  "users.write",
  "settings.write",
  "audit.read",
];

/**
 * The only role that can change what other people may do.
 *
 * Kept apart from `admin` deliberately: an admin who can grant themselves
 * `roles.write` is a super admin with extra steps.
 */
const SUPER_ADMIN: readonly Permission[] = [...PERMISSIONS];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [],
  customer_service: CUSTOMER_SERVICE,
  operator: OPERATOR,
  admin: ADMIN,
  super_admin: SUPER_ADMIN,
};

/** Whether a role holds a capability. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Whether a role holds every one of several capabilities. */
export function canAll(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.every((permission) => can(role, permission));
}

/** Whether a role holds at least one of several capabilities. */
export function canAny(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

/**
 * Whether a role belongs to the staff side of the product.
 *
 * Defined by rank rather than by listing roles, so a new staff role added
 * above `customer` is included without editing every call site.
 */
export function isStaffRole(role: Role): boolean {
  return ROLE_RANK[role] > ROLE_RANK.customer;
}

/**
 * Whether an actor may assign a role to someone.
 *
 * Two rules, both about privilege escalation:
 *   - only `roles.write` holders may assign at all, and
 *   - nobody may assign a role at or above their own rank.
 *
 * The second is what stops an admin from minting a super admin — or another
 * admin who could then be used to do it indirectly.
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (!can(actor, "roles.write")) return false;
  return ROLE_RANK[target] < ROLE_RANK[actor];
}

/** Type guard for values arriving from the database or a request. */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
