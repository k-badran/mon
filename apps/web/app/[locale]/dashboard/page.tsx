"use client";

import type { OrderSummary } from "@mon/client";
import Link from "next/link";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { telHref, useSiteSettings } from "@/lib/site/useSiteSettings";
import { useLiveOrders } from "@/lib/live/useLiveData";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import {
  IconCheck,
  IconMap,
  IconMessages,
  IconOrders,
  IconPhone,
  IconQuotes,
} from "@/app/components/dashboard/Icons";

/**
 * The customer's overview.
 *
 * Every figure is derived from the same live order query the rest of the
 * dashboard uses, so the tiles, the recent list and the appointment card can
 * never disagree with each other — which they would if each fetched its own
 * copy.
 */
export default function DashboardOverviewPage() {
  const { user } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const site = useSiteSettings();

  const { data, isLoading } = useLiveOrders({ limit: 50 });
  const orders = data?.items ?? [];

  const active = orders.filter((o) => o.status === "confirmed" || o.status === "quoted");
  const quoted = orders.filter((o) => o.status === "quoted");
  const completed = orders.filter((o) => o.status === "completed");

  // The soonest upcoming confirmed job is what the customer actually wants to
  // see; anything in the past is history.
  const today = new Date().toISOString().slice(0, 10);
  const next = orders
    .filter((o) => o.status === "confirmed" && o.scheduledDate && o.scheduledDate >= today)
    .sort((a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""))[0];

  const firstName = (user?.fullName ?? "").split(" ")[0] || "";

  return (
    <DashboardShell title={t("dash.overview")}>
      {/* ── Welcome ─────────────────────────────────────────────────── */}
      <section className="card welcome-card">
        <div className="copy">
          <h2>{t("dash.welcome", { values: { name: firstName } })} 👋</h2>
          <p>
            {next
              ? t("dash.welcomeWithMove", { values: { date: formatDate(next.scheduledDate!) } })
              : t("dash.welcomeNoMove")}
          </p>
        </div>

        {next ? (
          <Link className="btn primary" href={`/${locale}/dashboard/auftraege/${next.id}`}>
            {t("dash.trackMove")}
          </Link>
        ) : (
          <Link className="btn primary" href={`/${locale}`}>
            {t("orders.calculateNow")}
          </Link>
        )}
      </section>

      {/* ── Counts ──────────────────────────────────────────────────── */}
      <section className="stat-grid">
        <StatCard
          tone="brand"
          icon={<IconOrders />}
          label={t("dash.activeOrders")}
          value={isLoading ? null : active.length}
          sub={t("dash.inTransit", { count: active.length, values: { count: active.length } })}
        />
        <StatCard
          tone="warning"
          icon={<IconQuotes />}
          label={t("dash.pendingQuotes")}
          value={isLoading ? null : quoted.length}
          sub={t("dash.awaitingConfirmation")}
        />
        <StatCard
          tone="success"
          icon={<IconCheck />}
          label={t("dash.completedMoves")}
          value={isLoading ? null : completed.length}
          sub={t("dash.sinceJoining")}
        />
        <StatCard
          tone="info"
          icon={<IconMessages />}
          label={t("dash.unreadMessages")}
          value={isLoading ? null : 0}
          sub={t("dash.fromSupport")}
        />
      </section>

      {/* ── Recent orders + next appointment ────────────────────────── */}
      <div className="dash-split">
        <section className="card">
          <div className="card-head">
            <h2>{t("dash.recentOrders")}</h2>
            <Link href={`/${locale}/dashboard/auftraege`}>{t("dash.viewAll")}</Link>
          </div>

          {isLoading && (
            <div style={{ display: "grid", gap: "var(--space-3)" }} aria-busy="true">
              <div className="skeleton" style={{ blockSize: 52 }} />
              <div className="skeleton" style={{ blockSize: 52 }} />
            </div>
          )}

          {!isLoading && orders.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--space-8) 0" }}>
              <p style={{ color: "var(--text-muted)", marginBlockEnd: "var(--space-4)" }}>
                {t("orders.empty")}
              </p>
              <Link className="btn primary" href={`/${locale}`}>
                {t("orders.calculateNow")}
              </Link>
            </div>
          )}

          {orders.slice(0, 4).map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </section>

        <section className="card appointment">
          <div className="card-head">
            <h2>{t("dash.nextAppointment")}</h2>
          </div>

          {next ? (
            <>
              {/* The one item on this screen with a deadline, so it gets the
                  tint that separates it from the neutral detail below. */}
              <div className="when">
                <div className="date">{formatDate(next.scheduledDate!)}</div>
                <div className="eta">{t("dash.estimatedArrival")}</div>
              </div>

              <div className="crew">
                <span className="avatar" aria-hidden="true">
                  {next.contactName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="team">{t("dash.assignedTeam")}</div>
                  <div className="truck">
                    {t(`service.${next.serviceType}`)} · {next.reference}
                  </div>
                </div>
              </div>

              <div className="actions">
                <a className="btn ghost" href={telHref(site.phone)}>
                  <IconPhone />
                  {t("dash.contactTeam")}
                </a>
                <Link className="btn primary" href={`/${locale}/dashboard/auftraege/${next.id}`}>
                  <IconMap />
                  {t("dash.viewDetails")}
                </Link>
              </div>
            </>
          ) : (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("dash.noAppointment")}</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );

  function OrderRow({ order }: { order: OrderSummary }) {
    return (
      <Link
        href={`/${locale}/dashboard/auftraege/${order.id}`}
        className="order-row"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="who">
          <div className="ref">{order.reference}</div>
          <div className="svc">{t(`service.${order.serviceType}`)}</div>
        </div>

        <span className={`pill is-${order.status}`}>{t(`status.${order.status}`)}</span>
        <span className="amount">{formatCurrency(order.totalGross)}</span>
      </Link>
    );
  }
}

function StatCard({
  tone,
  icon,
  label,
  value,
  sub,
}: {
  tone: "brand" | "warning" | "success" | "info";
  icon: React.ReactNode;
  label: string;
  value: number | null;
  sub: string;
}) {
  return (
    <article className="stat-card">
      <div>
        <div className="label">{label}</div>
        {value === null ? (
          <div className="skeleton" style={{ blockSize: 28, inlineSize: 40 }} />
        ) : (
          <div className="value">{value}</div>
        )}
        <div className="sub">{sub}</div>
      </div>

      <span className={`stat-icon is-${tone}`} aria-hidden="true">
        {icon}
      </span>
    </article>
  );
}
