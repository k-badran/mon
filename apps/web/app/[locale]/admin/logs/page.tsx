"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { IconSearch } from "@/app/components/dashboard/Icons";

/**
 * The audit trail.
 *
 * Read-only on purpose: the API has no route that edits or removes an entry,
 * so neither does this screen. What it shows was written by the server inside
 * the transaction of each change, with the actor taken from the verified
 * token — the legacy log was written from the browser and could name anyone.
 *
 * Filtering and paging happen on the server. The table grows without bound,
 * so filtering a fetched page in the browser would hide matches that sit on
 * later pages.
 */

interface AuditItem {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: unknown;
  actorId: string | null;
  actorEmail: string | null;
  actorIsSystem: boolean;
  actorName: string | null;
  ipAddress: string | null;
  requestId: string | null;
}

interface AuditPage {
  items: AuditItem[];
  nextCursor?: string;
}

interface AuditFacets {
  actions: string[];
  actors: Array<{ id: string; email: string; fullName: string }>;
}

interface Filters {
  action: string;
  actorId: string;
  /** Calendar days as the date inputs hold them, YYYY-MM-DD. */
  from: string;
  to: string;
  search: string;
}

const EMPTY_FILTERS: Filters = { action: "", actorId: "", from: "", to: "", search: "" };

const PAGE_SIZE = 50;

/** Long enough to cover typing a word, short enough not to feel laggy. */
const SEARCH_DEBOUNCE_MS = 300;

export default function AuditLogPage() {
  const { sdk, user, loading: authLoading } = useApi();
  const { t, locale } = useI18n();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [facets, setFacets] = useState<AuditFacets>({ actions: [], actors: [] });
  const [items, setItems] = useState<AuditItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const settledSearch = useDebounced(filters.search.trim(), SEARCH_DEBOUNCE_MS);

  // The query the server sees. The search term is the debounced one, so a
  // request is not spent on every keystroke.
  const query = buildQuery({ ...filters, search: settledSearch });
  const queryKey = JSON.stringify(query);

  // Read by loadMore after its await, so it compares against the filters
  // current at that moment rather than those it closed over.
  const latestKey = useRef(queryKey);
  latestKey.current = queryKey;

  useEffect(() => {
    if (authLoading || !user) return;

    // A filter's options come from what the log actually contains. Failing to
    // load them leaves the filters empty rather than the page broken.
    sdk.http
      .get<AuditFacets>("/api/audit/facets")
      .then(setFacets)
      .catch(() => undefined);
  }, [authLoading, user, sdk]);

  // First page, re-run whenever the filters change. Only the newest run
  // commits: a slow response for an old filter must not overwrite the rows
  // for the current one.
  useEffect(() => {
    if (authLoading || !user) return;

    let current = true;
    setLoading(true);
    setError(null);

    sdk.http
      .get<AuditPage>("/api/audit", JSON.parse(queryKey) as Record<string, string | number>)
      .then((page) => {
        if (!current) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setExpanded(new Set());
      })
      .catch(() => {
        if (current) setError(t("admin.logs.loadFailed"));
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
    };
  }, [authLoading, user, sdk, queryKey, t]);

  async function loadMore() {
    if (!nextCursor) return;

    // The filters this page belongs to. If they change while it is in flight,
    // the answer is for a list that is no longer on screen and is dropped.
    const requestedFor = queryKey;
    setLoadingMore(true);
    setError(null);

    try {
      const page = await sdk.http.get<AuditPage>("/api/audit", {
        ...query,
        cursor: nextCursor,
      });

      if (requestedFor !== latestKey.current) return;
      setItems((previous) => [...previous, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      setError(t("admin.logs.loadFailed"));
    } finally {
      setLoadingMore(false);
    }
  }

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * A translated label, or the raw key when there is none.
   *
   * `t` answers a miss with the key itself, which is exactly the fallback
   * wanted: an action added to the API before its translation still reads
   * as something rather than disappearing.
   */
  function labelFor(prefix: string, raw: string): string {
    const key = `${prefix}.${raw}`;
    const label = t(key);
    return label === key ? raw : label;
  }

  const timeFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" });
  const hasFilters = Object.values(filters).some((value) => value !== "");

  return (
    <DashboardShell title={t("admin.nav.logs")} variant="staff">
      <p className="muted" style={{ margin: 0, maxInlineSize: "70ch" }}>
        {t("admin.logs.lead")}
      </p>

      <div className="table-toolbar audit-toolbar">
        <label htmlFor="log-action" className="sr-only">{t("admin.logs.action")}</label>
        <select
          id="log-action"
          value={filters.action}
          onChange={(event) => setFilter("action", event.target.value)}
        >
          <option value="">{t("admin.logs.allActions")}</option>
          {facets.actions.map((action) => (
            <option key={action} value={action}>{labelFor("admin.logs.action", action)}</option>
          ))}
        </select>

        <label htmlFor="log-actor" className="sr-only">{t("admin.logs.actor")}</label>
        <select
          id="log-actor"
          value={filters.actorId}
          onChange={(event) => setFilter("actorId", event.target.value)}
        >
          <option value="">{t("admin.logs.allActors")}</option>
          {facets.actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.fullName} ({actor.email})
            </option>
          ))}
        </select>

        <label className="audit-date">
          <span>{t("admin.logs.from")}</span>
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => setFilter("from", event.target.value)}
          />
        </label>
        <label className="audit-date">
          <span>{t("admin.logs.to")}</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => setFilter("to", event.target.value)}
          />
        </label>

        <div className="dash-search spacer">
          <IconSearch className="search-icon" />
          <label htmlFor="log-search" className="sr-only">{t("common.search")}</label>
          <input
            id="log-search"
            type="search"
            placeholder={t("admin.logs.searchPlaceholder")}
            value={filters.search}
            onChange={(event) => setFilter("search", event.target.value)}
          />
        </div>

        {hasFilters && (
          <button type="button" className="btn ghost small" onClick={() => setFilters(EMPTY_FILTERS)}>
            {t("admin.logs.clearFilters")}
          </button>
        )}
      </div>

      <div aria-live="polite">
        {error && (
          <div className="calc-error">{error}</div>
        )}
      </div>

      {loading && (
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="card empty-state">
          <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("admin.logs.empty")}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th>{t("admin.logs.time")}</th>
                <th>{t("admin.logs.actor")}</th>
                <th>{t("admin.logs.action")}</th>
                <th>{t("admin.logs.target")}</th>
                <th><span className="sr-only">{t("admin.logs.showDetails")}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const open = expanded.has(item.id);
                const detailId = `audit-${item.id}`;

                return (
                  <Fragment key={item.id}>
                    <tr className={open ? "is-open" : undefined}>
                      <td data-label={t("admin.logs.time")}>
                        <time dateTime={item.createdAt} className="audit-time">
                          {timeFormat.format(new Date(item.createdAt))}
                        </time>
                      </td>
                      <td data-label={t("admin.logs.actor")}>
                        <ActorCell item={item} />
                      </td>
                      <td data-label={t("admin.logs.action")}>
                        <strong>{labelFor("admin.logs.action", item.action)}</strong>
                      </td>
                      <td data-label={t("admin.logs.target")}>
                        <span className="audit-stack">
                          <span>{labelFor("admin.logs.entity", item.entityType)}</span>
                          {item.entityId && (
                            <code dir="ltr" className="audit-id">{item.entityId}</code>
                          )}
                        </span>
                      </td>
                      <td className="row-action">
                        <button
                          type="button"
                          className="btn ghost small"
                          aria-expanded={open}
                          aria-controls={detailId}
                          onClick={() => toggle(item.id)}
                        >
                          {open ? t("admin.logs.hideDetails") : t("admin.logs.showDetails")}
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="audit-detail" id={detailId}>
                        <td colSpan={5}>
                          <AuditDetail item={item} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="pager">
            <span className="count">
              {t("admin.logs.shown", { count: items.length })}
            </span>
            {nextCursor && (
              <button type="button" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? t("common.loading") : t("admin.logs.loadMore")}
              </button>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ActorCell({ item }: { item: AuditItem }) {
  const { t } = useI18n();

  if (item.actorIsSystem) return <span>{t("admin.logs.system")}</span>;

  // The email is the one recorded at the time; the name is the account's
  // current one and is missing once the account is gone.
  if (!item.actorName && !item.actorEmail) {
    return <span className="muted">{t("admin.logs.unknownActor")}</span>;
  }

  return (
    <span className="audit-stack">
      <span>{item.actorName ?? item.actorEmail}</span>
      {item.actorName && item.actorEmail && (
        <span className="muted" dir="ltr">{item.actorEmail}</span>
      )}
    </span>
  );
}

function AuditDetail({ item }: { item: AuditItem }) {
  const { t } = useI18n();

  const facts: Array<[string, string | null]> = [
    [t("admin.logs.rawAction"), item.action],
    [t("admin.logs.entryId"), item.id],
    [t("admin.logs.requestId"), item.requestId],
    [t("admin.logs.ip"), item.ipAddress],
  ];

  return (
    <div className="audit-detail-body">
      <dl className="audit-facts">
        {facts
          .filter((fact): fact is [string, string] => Boolean(fact[1]))
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd><code dir="ltr">{value}</code></dd>
            </div>
          ))}
      </dl>

      <h3 className="audit-changes-title">{t("admin.logs.changes")}</h3>
      {item.changes === null ? (
        <p className="muted" style={{ margin: 0 }}>{t("admin.logs.noChanges")}</p>
      ) : (
        // Always left-to-right: JSON is code, and mirroring it in Arabic
        // would put every brace and colon on the wrong side.
        <pre className="audit-json" dir="ltr">
          {typeof item.changes === "string"
            ? item.changes
            : JSON.stringify(item.changes, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * The filters as API query parameters.
 *
 * Days become instants at the viewer's own midnight, and the end day is made
 * inclusive by asking for everything before the following midnight — so
 * "to 3 May" includes the whole of 3 May wherever the viewer is.
 */
function buildQuery(filters: Filters): Record<string, string | number> {
  const query: Record<string, string | number> = { limit: PAGE_SIZE };

  if (filters.action) query.action = filters.action;
  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.search) query.search = filters.search;

  const from = filters.from ? localMidnight(filters.from, 0) : null;
  const to = filters.to ? localMidnight(filters.to, 1) : null;

  // An inverted range cannot match anything and the API refuses it; the date
  // inputs' min/max make it hard to enter, and it is dropped if it slips by.
  if (from && (!to || from < to)) query.from = from.toISOString();
  if (to && (!from || from < to)) query.to = to.toISOString();

  return query;
}

function localMidnight(day: string, offsetDays: number): Date | null {
  const [year, month, date] = day.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !date) return null;
  return new Date(year, month - 1, date + offsetDays);
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

