"use client";

import type {
  CreateUserInput,
  ManagedUser,
  UserRole,
  UserStatus,
} from "@mon/client";
import { ROLES, ROLE_RANK, canAssignRole } from "@mon/core";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";

/**
 * User and role administration.
 *
 * ## What this screen is allowed to decide
 *
 * Nothing. It reads the viewer's capabilities and hides what they cannot use,
 * because offering a button that answers 403 is a worse experience than not
 * offering it — but every control here calls an endpoint that re-reads the
 * caller's role from the database and checks the capability again for itself.
 * The role selector below and `canAssignRole` on the server are the same
 * function from the same package, so what the UI offers and what the API
 * accepts cannot drift apart; if they somehow did, the API's answer is the one
 * that counts.
 *
 * In the version this replaces, the browser wrote `profiles.role` directly and
 * whether a customer could promote themselves came down to how one row-level
 * security policy happened to be phrased.
 *
 * ## Why blocking is not just a flag
 *
 * Blocking revokes the account's live sessions server-side. Without that, a
 * blocked account keeps working until its access token happens to expire —
 * up to fifteen minutes of someone you have just locked out still being
 * logged in.
 */

type RoleFilter = UserRole | "";
type StatusFilter = UserStatus | "";

/** Long enough to cover typing a word, short enough not to feel laggy. */
const SEARCH_DEBOUNCE_MS = 300;

export default function UsersPage() {
  const { sdk, user, loading: authLoading, can } = useApi();
  const { t, locale } = useI18n();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ManagedUser | null>(null);
  const [creating, setCreating] = useState(false);

  // What the viewer may do. Read once here rather than at each control, so the
  // whole screen agrees with itself about who is looking at it.
  const mayWrite = can("users.write");
  const mayAssignRoles = can("roles.write");
  const actorRole = user?.role;

  /**
   * The roles this viewer may hand out.
   *
   * `canAssignRole` refuses anything at or above the actor's own rank, which
   * is what stops an admin from minting a super admin — or a second admin who
   * could then be used to do it indirectly. Asking the shared function rather
   * than filtering by hand means the list here is the list the server accepts.
   */
  const assignableRoles = useMemo<UserRole[]>(
    () => (actorRole ? ROLES.filter((role) => canAssignRole(actorRole, role)) : []),
    [actorRole],
  );

  // Searching runs an ilike across two columns. A request per keystroke spends
  // them on results that are obsolete before they land.
  const settledSearch = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);

  // Loading only. The edge middleware decided whether this page may be opened
  // at all, and the API decides whether it returns any data.
  useEffect(() => {
    if (authLoading || !user) return;

    // Responses do not necessarily arrive in the order they were sent: a slow
    // request for "a" settling after a quick one for "abc" would leave the
    // wrong rows sitting under the current query. Only the newest run commits.
    let current = true;

    void (async () => {
      setError(null);

      try {
        const result = await sdk.users.list({
          limit: 50,
          ...(settledSearch ? { search: settledSearch } : {}),
          ...(roleFilter ? { role: roleFilter } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        });

        if (current) setUsers(result.items);
      } catch {
        if (current) setError(t("admin.usersFailed"));
      } finally {
        if (current) setLoading(false);
      }
    })();

    return () => {
      current = false;
    };
  }, [authLoading, user, sdk, settledSearch, roleFilter, statusFilter, t]);

  async function update(target: ManagedUser, patch: { role?: UserRole; status?: UserStatus }) {
    setBusyId(target.id);
    setError(null);
    setNotice(null);

    try {
      const updated = await sdk.users.update(target.id, patch);

      // Reconciled from the server's response, never assumed. The old panel
      // set React state first and never checked the write, so the table could
      // show a role the database had refused to grant.
      setUsers((previous) =>
        previous.map((item) => (item.id === target.id ? { ...item, ...updated } : item)),
      );
      setConfirming(null);
    } catch (caught) {
      // The server's message names the actual rule it enforced — "you cannot
      // assign a role at or above your own" is more useful than a generic
      // failure, and it is the authoritative answer either way.
      setError(caught instanceof ApiError ? caught.message : t("admin.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardShell title={t("admin.users")} variant="staff">
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={t("admin.users")} variant="staff">
      <header className="admin-head">
        <p className="muted" style={{ margin: 0, maxInlineSize: "60ch" }}>
          {t("admin.usersLead")}
        </p>

        {/* Hidden, not disabled: a greyed-out "New user" button tells a
            customer-service agent exactly which door they are being kept out
            of and invites them to look for it. */}
        {mayWrite && (
          <button
            type="button"
            className="btn primary"
            style={{ marginInlineStart: "auto" }}
            onClick={() => {
              setNotice(null);
              setCreating(true);
            }}
          >
            {t("admin.newUser")}
          </button>
        )}
      </header>

      <div className="admin-filters">
        <label htmlFor="search" className="sr-only">
          {t("common.search")}
        </label>
        <input
          id="search"
          type="search"
          placeholder={t("admin.searchUsers")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <label htmlFor="role" className="sr-only">
          {t("admin.role")}
        </label>
        <select
          id="role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
        >
          <option value="">{t("admin.allRoles")}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`admin.role.${role}`)}
            </option>
          ))}
        </select>

        <label htmlFor="status" className="sr-only">
          {t("common.status")}
        </label>
        <select
          id="status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          <option value="">{t("admin.allStatuses")}</option>
          <option value="active">{t("status.active")}</option>
          <option value="blocked">{t("status.blocked")}</option>
        </select>
      </div>

      <div aria-live="polite">
        {error && <div className="calc-error">{error}</div>}
        {notice && <div className="calc-success">{notice}</div>}
      </div>

      {users.length === 0 && !error && <p className="auth-sub">{t("admin.noUsers")}</p>}

      {users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("common.email")}</th>
                <th>{t("admin.role")}</th>
                <th>{t("common.status")}</th>
                <th>{t("admin.joined")}</th>
                <th>{t("admin.lastLogin")}</th>
                <th>{t("common.action")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => {
                const isSelf = row.id === user?.id;

                /**
                 * Whether this row is out of the viewer's reach.
                 *
                 * Rank, not capability — the same comparison the server makes
                 * before it touches the row. Without it, `users.write` alone
                 * would let an admin block or demote the super admin, taking
                 * the only role that can grant roles out of play. That is
                 * escalation by subtraction.
                 *
                 * Note this is deliberately *not* `canAssignRole`: that also
                 * demands `roles.write`, which would leave an admin — who may
                 * legitimately block a customer — unable to touch anybody.
                 */
                const outranksViewer =
                  !actorRole || ROLE_RANK[row.role] >= ROLE_RANK[actorRole];

                // Self-service is deliberately impossible here. An administrator
                // who removes their own role, or blocks their own account, has
                // locked themselves out with nobody left able to undo it — and
                // the server refuses this case too, so the disabled control is
                // an explanation rather than a protection.
                const mayEditRow = mayWrite && !isSelf && !outranksViewer;
                const mayEditRole = mayEditRow && mayAssignRoles;

                return (
                  <tr key={row.id}>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>
                      {mayEditRole ? (
                        <select
                          value={row.role}
                          disabled={busyId === row.id}
                          onChange={(event) =>
                            void update(row, { role: event.target.value as UserRole })
                          }
                          aria-label={t("admin.roleOf", { values: { name: row.fullName } })}
                        >
                          {/* The account's current role stays listed even when
                              it is not one this viewer could assign, or the
                              select would silently show the wrong value. */}
                          {(assignableRoles.includes(row.role)
                            ? assignableRoles
                            : [row.role, ...assignableRoles]
                          ).map((role) => (
                            <option key={role} value={role}>
                              {t(`admin.role.${role}`)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`role-pill role-${row.role}`}>
                          {t(`admin.role.${row.role}`)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${row.status}`}>
                        {t(`status.${row.status}`)}
                      </span>
                    </td>
                    <td>{new Date(row.createdAt).toLocaleDateString(locale)}</td>
                    <td>
                      {row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleDateString(locale)
                        : "—"}
                    </td>
                    <td>
                      {isSelf ? (
                        <span className="muted">{t("admin.yourself")}</span>
                      ) : !mayEditRow ? (
                        <span className="muted">—</span>
                      ) : row.status === "active" ? (
                        <button
                          type="button"
                          className="btn ghost small"
                          disabled={busyId === row.id}
                          onClick={() => setConfirming(row)}
                        >
                          {t("admin.block")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn primary small"
                          disabled={busyId === row.id}
                          onClick={() => void update(row, { status: "active" })}
                        >
                          {t("admin.unblock")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <CreateUserDialog
          assignableRoles={assignableRoles}
          onCancel={() => setCreating(false)}
          onCreated={(created, temporaryPassword) => {
            setCreating(false);
            setUsers((previous) => [created, ...previous]);
            setNotice(
              temporaryPassword
                ? t("admin.createdWithPassword", {
                    values: { email: created.email, password: temporaryPassword },
                  })
                : t("admin.created", { values: { email: created.email } }),
            );
          }}
        />
      )}

      {/* A real dialog naming the affected account, rather than window.confirm,
          which cannot say whose account is about to stop working. */}
      {confirming && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-title"
        >
          <div className="modal">
            <h2 id="block-title">
              {t("admin.blockTitle", { values: { name: confirming.fullName } })}
            </h2>
            <p>{t("admin.blockBody", { values: { email: confirming.email } })}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirming(null)}
                disabled={busyId === confirming.id}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => void update(confirming, { status: "blocked" })}
                disabled={busyId === confirming.id}
              >
                {busyId === confirming.id ? t("admin.blocking") : t("admin.blockConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/** Holds a value still until it has stopped changing for `delay`. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

/**
 * Creating a colleague's account.
 *
 * The role list is `assignableRoles`, which the parent derived from
 * `canAssignRole` — so this form cannot offer a role the server would refuse,
 * and if the list is empty the form is not reachable at all. The password is
 * left to the server: an administrator inventing a colleague's password tends
 * to invent the same one repeatedly, and it means one fewer secret typed into
 * a form that someone might be reading over a shoulder.
 */
function CreateUserDialog({
  assignableRoles,
  onCancel,
  onCreated,
}: {
  assignableRoles: readonly UserRole[];
  onCancel: () => void;
  onCreated: (user: ManagedUser, temporaryPassword: string | undefined) => void;
}) {
  const { sdk } = useApi();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  // Customer is always offerable: creating one grants no capability, so it
  // needs no rank check and is not in `assignableRoles`, which is about
  // handing out power.
  const [role, setRole] = useState<UserRole>("customer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = useMemo<UserRole[]>(
    () => ["customer", ...assignableRoles.filter((item) => item !== "customer")],
    [assignableRoles],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const body: CreateUserInput = { email: email.trim(), fullName: fullName.trim(), role };
      const result = await sdk.users.create(body);

      onCreated(result.user, result.temporaryPassword);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("admin.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <form className="modal" onSubmit={(event) => void submit(event)}>
        <h2 id="create-title">{t("admin.newUser")}</h2>
        <p>{t("admin.newUserBody")}</p>

        <div className="field-grid">
          <div>
            <label htmlFor="new-name">{t("common.name")}</label>
            <input
              id="new-name"
              required
              minLength={2}
              maxLength={120}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="new-email">{t("common.email")}</label>
            <input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="off"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="new-role">{t("admin.role")}</label>
            <select
              id="new-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`admin.role.${option}`)}
                </option>
              ))}
            </select>
            <p className="field-hint">{t(`admin.roleHint.${role}`)}</p>
          </div>
        </div>

        <div aria-live="polite">{error && <div className="calc-error">{error}</div>}</div>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? t("common.saving") : t("admin.createUser")}
          </button>
        </div>
      </form>
    </div>
  );
}
