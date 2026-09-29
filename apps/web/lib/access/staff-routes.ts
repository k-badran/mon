import type { Permission } from "@mon/core";

/**
 * Every staff destination, and the capability that opens it.
 *
 * ## Why there is only one list
 *
 * There used to be two: the prefixes the edge middleware guards, and the
 * `permission` each navigation entry declared. They were described as
 * mirroring each other and did not. Eight of the fourteen destinations in the
 * navigation had no entry at the edge at all, so they fell through to the
 * `/admin` catch-all and would have opened for anyone holding `orders.read` —
 * the weakest staff capability there is. Audit logs, payments, dispatch and
 * the capacity calendar were all in that group. And the two lists had already
 * drifted on a name: the edge guarded `/admin/abrechnung` while the navigation
 * linked `/admin/zahlungen`, so the guarded path was not linked and the linked
 * path was not specifically guarded.
 *
 * A route added here is guarded and navigable in the same edit, and a
 * navigation entry that names a path not in this list does not compile.
 *
 * ## What this list is not
 *
 * It is not the authorisation boundary. It decides what to render and where to
 * send someone; the endpoint behind each screen re-reads the caller's role from
 * the database and checks the capability for itself. A visitor who defeats
 * everything here reaches a page that loads no data.
 */

interface StaffRoute {
  readonly path: string;
  readonly permission: Permission;
}

export const STAFF_ROUTES = [
  // The overview is the landing page for the staff side, so it asks for the
  // least any staff role has. It is also the floor for any /admin path not
  // listed below — a screen added without an entry here is staff-only rather
  // than open, but it gets the weakest staff capability until it is declared.
  { path: "/admin", permission: "orders.read" },
  { path: "/admin/nutzer", permission: "users.read" },
  // A lead is a quote that has not been accepted yet.
  { path: "/admin/leads", permission: "quotes.read" },
  { path: "/admin/auftraege", permission: "orders.read" },
  // Dispatch and partners both exist to put someone else on a job, so they
  // belong to whoever may hand work over rather than to whoever may see it.
  { path: "/admin/dispatch", permission: "orders.assign" },
  { path: "/admin/partner", permission: "orders.assign" },
  { path: "/admin/preise", permission: "pricing.read" },
  { path: "/admin/abrechnung", permission: "payments.read" },
  // Reporting is mostly revenue, so it is gated with the money it shows rather
  // than with a capability of its own.
  { path: "/admin/analytics", permission: "payments.read" },
  // Operations is the capacity calendar — what the company can take on.
  { path: "/admin/betrieb", permission: "availability.write" },
  // Read, not moderate: complaints handling is customer service's job, and
  // they need to see what was said before they can answer it.
  { path: "/admin/qualitaet", permission: "reviews.read" },
  // The support inbox opens on reading; answering and taking over need
  // `messages.write`, which the screen checks per control and the API per call.
  { path: "/admin/nachrichten", permission: "messages.read" },
  { path: "/admin/logs", permission: "audit.read" },
  { path: "/admin/website", permission: "content.write" },
  { path: "/admin/einstellungen", permission: "settings.write" },
] as const satisfies readonly StaffRoute[];

/** The paths above, as a type. A navigation entry may only name one of these. */
export type StaffRoutePath = (typeof STAFF_ROUTES)[number]["path"];

/** The capability a known staff path requires. */
export function permissionFor(path: StaffRoutePath): Permission {
  // The path came from this same list, so the lookup cannot miss; the throw is
  // for the impossible case rather than a branch a caller has to handle.
  const route = STAFF_ROUTES.find((entry) => entry.path === path);

  if (!route) throw new Error(`No staff route is declared for ${path}.`);

  return route.permission;
}

/**
 * The capability a request for `route` requires, or null when it is not a
 * staff route at all.
 *
 * The most specific declared path wins, worked out from the paths themselves
 * rather than from the order they happen to be written in. The previous
 * version relied on `/admin` being written last and said so in a comment —
 * which is one reordering away from silently downgrading five screens to
 * `orders.read`.
 */
export function requiredPermission(route: string): Permission | null {
  let best: StaffRoute | null = null;

  for (const entry of STAFF_ROUTES) {
    if (!isUnder(route, entry.path)) continue;
    if (!best || entry.path.length > best.path.length) best = entry;
  }

  return best?.permission ?? null;
}

/**
 * Prefix matching that respects path boundaries.
 *
 * `startsWith` alone made `/administration` a match for `/admin` and
 * `/admin/nutzerverwaltung` a match for `/admin/nutzer`. Both happened to fail
 * safe — they over-protected — but the same rule would have quietly handed a
 * future `/admin/preise-public` the pricing capability as its requirement.
 */
export function isUnder(route: string, prefix: string): boolean {
  return route === prefix || route.startsWith(`${prefix}/`);
}
