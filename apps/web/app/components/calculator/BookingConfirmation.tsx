"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import type { PriceBreakdown, QuoteInput } from "@umzugplus/core";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { telHref, useSiteSettings } from "@/lib/site/useSiteSettings";
import type { CalculatorState } from "@/lib/calculator/machine";

/**
 * The confirmation screen — the last frame of the calculator.
 *
 * It turns a priced quote into a booked order, which the backend does in two
 * calls: `POST /api/auth/register` (the quote is adopted by the new account
 * through `quoteId`) and then `POST /api/orders`, which reads the price from
 * the stored quote row and ignores anything the browser might say about money.
 *
 * Two things the design draws that the backend does not have, and which are
 * therefore stated on screen rather than mimed:
 *
 *   1. **There is no checkout.** `payments` is an internal ledger a staff
 *      member posts to once money has arrived; there is no provider, no
 *      session, no card capture, and `createOrderSchema` has no payment field.
 *      So the four cards are a preference, the screen says so, and the button
 *      does not promise to take money it cannot take.
 *   2. The rail's "3-Room Apartment", "45 Boxes" and the plan name have no
 *      counterpart in `QuoteInput` — rooms, boxes and packages are not
 *      modelled at all. What the customer actually answered is shown instead
 *      of a plausible-looking invention.
 */

/** Mirrors the wizard's own key; the answers are handed over, not re-asked. */
const WIZARD_STORAGE_KEY = "umzugplus.calculator.v1";

/** Mirrors PASSWORD_MIN_LENGTH in `@umzugplus/auth`, which is server-only. */
const PASSWORD_MIN_LENGTH = 10;

/**
 * What `GET /api/quotes/:id` returns: the stored row, which is wider than the
 * SDK's `QuoteResult` for the create call — it carries the answers back too.
 */
interface StoredQuote {
  id: string;
  serviceType: QuoteInput["serviceType"];
  customerType: QuoteInput["customerType"];
  input: QuoteInput;
  breakdown: PriceBreakdown;
  totalGross: string;
  estimatedHours: string | null;
  distanceKm: string | null;
  expiresAt: string;
  consumedAt: string | null;
}

type PaymentMethod = "card" | "paypal" | "bank_transfer" | "cash_on_delivery";

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  labelKey: string;
  hintKey: string;
  icon: ReactNode;
}> = [
  {
    value: "card",
    labelKey: "calc.confirm.payCard",
    hintKey: "calc.confirm.payCardHint",
    icon: <IconCard />,
  },
  {
    value: "paypal",
    labelKey: "calc.confirm.payPaypal",
    hintKey: "calc.confirm.payPaypalHint",
    icon: <IconWallet />,
  },
  {
    value: "bank_transfer",
    labelKey: "calc.confirm.payBank",
    hintKey: "calc.confirm.payBankHint",
    icon: <IconBank />,
  },
  {
    value: "cash_on_delivery",
    labelKey: "calc.confirm.payCash",
    hintKey: "calc.confirm.payCashHint",
    icon: <IconCash />,
  },
];

/** The five chips the three result frames share. */
const TABS = [
  "calc.tab.route",
  "calc.tab.inventory",
  "calc.tab.special",
  "calc.tab.schedule",
  "calc.tab.quote",
];

const ARRIVAL_TIMES = ["07:00", "08:00", "09:00", "10:00", "12:00", "14:00"];

export function BookingConfirmation() {
  const { sdk, user, signUp } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const quoteId = params.get("quote") ?? "";

  const [quote, setQuote] = useState<StoredQuote | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [consent, setConsent] = useState(false);

  const [arrivalTime, setArrivalTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReactNode>(null);
  const [reference, setReference] = useState<string | null>(null);

  const loginHref = `/${locale}/login?next=${encodeURIComponent(
    `/${locale}/buchen?quote=${quoteId}`,
  )}`;

  // The wizard kept its answers in session storage; the time of day is the one
  // the customer picked there and is not part of the quote row.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY);
      if (!saved) return;

      const state = JSON.parse(saved) as Partial<CalculatorState>;
      if (typeof state.scheduledTime === "string") setArrivalTime(state.scheduledTime);
    } catch {
      // A blocked or corrupt store only means the hour has to be picked again.
    }
  }, []);

  // A signed-in customer should not retype what the account already knows.
  useEffect(() => {
    if (!user) return;

    setFullName((current) => current || user.fullName);
    setEmail((current) => current || user.email);
  }, [user]);

  useEffect(() => {
    if (!quoteId) return;

    let cancelled = false;

    sdk.http
      .get<StoredQuote>(`/api/quotes/${quoteId}`)
      .then((loaded) => {
        if (!cancelled) setQuote(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [sdk, quoteId]);

  const scheduledDate = quote?.input.scheduledDate ?? "";

  /** Maps the failures this screen can actually provoke onto something actionable. */
  function describeFailure(caught: unknown): ReactNode {
    if (!(caught instanceof ApiError)) return t("error.generic");

    switch (caught.code) {
      case "EMAIL_TAKEN":
        return (
          <>
            {t("error.emailTaken")}{" "}
            <Link className="font-semibold text-brand-red underline" href={loginHref}>
              {t("calc.confirm.loginHere")}
            </Link>
          </>
        );
      case "SLOT_TAKEN":
        return (
          <>
            {t("error.slotTaken")}{" "}
            <Link className="font-semibold text-brand-red underline" href={`/${locale}/rechner`}>
              {t("calc.confirm.pickAnotherDate")}
            </Link>
          </>
        );
      case "QUOTE_EXPIRED":
        return (
          <>
            {t("error.quoteExpired")}{" "}
            <Link className="font-semibold text-brand-red underline" href={`/${locale}/rechner`}>
              {t("calc.confirm.backToCalculator")}
            </Link>
          </>
        );
      case "QUOTE_ALREADY_USED":
      case "CONFLICT":
        return t("calc.confirm.quoteUsed");
      case "VALIDATION_FAILED":
      case "INVALID_INPUT":
        return t("error.checkFields");
      case "RATE_LIMITED":
        return t("error.rateLimited");
      case "NETWORK_ERROR":
        return t("error.network");
      default:
        return t("error.generic");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!quote || !scheduledDate) return;

    if (!consent) {
      setError(t("calc.confirm.consentRequired"));
      return;
    }

    if (!user && password !== confirmPassword) {
      setError(t("calc.confirm.passwordMismatch"));
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Registration first, carrying the quote id, so `adoptAnonymousQuote`
      // attaches the price the visitor just saw to the new account.
      if (!user) {
        await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          locale,
          quoteId: quote.id,
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        });
      }

      const order = await sdk.orders.create({
        quoteId: quote.id,
        contactName: fullName.trim(),
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        scheduledDate,
        scheduledTime: arrivalTime,
        locale,
        // Staff-facing and deliberately untranslated: there is no payment
        // column yet, so `notes` is the only place this preference can travel,
        // and it has to read the same whatever language the customer booked in.
        notes: `Payment preference: ${payment}`,
      });

      // The answers are an order now; leaving them behind would offer a
      // half-finished wizard on the next visit.
      try {
        sessionStorage.removeItem(WIZARD_STORAGE_KEY);
      } catch {
        // Nothing to clean up if the store was never writable.
      }

      setReference(order.reference);
    } catch (caught) {
      setSubmitting(false);
      setError(describeFailure(caught));
    }
  }

  const canSubmit =
    Boolean(quote) &&
    Boolean(scheduledDate) &&
    Boolean(arrivalTime) &&
    consent &&
    fullName.trim().length > 1 &&
    phone.trim().length > 4 &&
    /.+@.+\..+/.test(email) &&
    (Boolean(user) || password.length >= PASSWORD_MIN_LENGTH);

  /**
   * The consent sentence with two links inside it.
   *
   * Split out of the translated template rather than concatenated, so every
   * language keeps its own word order around the two link texts.
   */
  function ConsentSentence() {
    const pieces = t("calc.confirm.consent").split(/(\{terms\}|\{privacy\})/);

    return (
      <>
        {pieces.map((piece, position) => {
          if (piece === "{terms}") {
            return (
              <Link key={position} className="font-semibold text-brand-red" href={`/${locale}/agb`}>
                {t("calc.confirm.terms")}
              </Link>
            );
          }

          if (piece === "{privacy}") {
            return (
              <Link
                key={position}
                className="font-semibold text-brand-red"
                href={`/${locale}/datenschutz`}
              >
                {t("calc.confirm.privacy")}
              </Link>
            );
          }

          return <span key={position}>{piece}</span>;
        })}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <CalcHeader />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start lg:px-12 lg:py-12">
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <h1 className="sr-only">{t("calc.confirm.title")}</h1>

          {reference ? (
            <section className="flex flex-col items-start gap-4 rounded-xl border border-success bg-success-soft p-8">
              <h2 className="text-h3 text-success-text">{t("calc.successTitle")}</h2>
              <p className="text-body text-success-text">
                {t("calc.confirm.successBody", { values: { reference } })}
              </p>

              <button
                type="button"
                className="btn primary"
                onClick={() => router.push(`/${locale}/dashboard`)}
              >
                {t("calc.goToOrders")}
              </button>
            </section>
          ) : !quoteId || loadFailed ? (
            <Notice>
              {t("calc.confirm.noQuote")}{" "}
              <Link className="font-semibold text-brand-red underline" href={`/${locale}/rechner`}>
                {t("calc.confirm.backToCalculator")}
              </Link>
            </Notice>
          ) : !quote ? (
            <div
              className="h-64 rounded-xl border border-border-subtle bg-surface-card"
              aria-busy="true"
              aria-label={t("common.loading")}
            />
          ) : (
            <>
              {user ? null : (
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-card p-5">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-h5 font-bold text-text-strong">
                      {t("calc.confirm.registerTitle")}
                    </h2>
                    <p className="text-body-sm text-text-default">
                      {t("calc.confirm.registerBody")}
                    </p>
                  </div>

                  <p className="flex items-center gap-1 text-body-sm text-text-default">
                    {t("calc.confirm.alreadyRegistered")}
                    <Link className="font-bold text-brand-red" href={loginHref}>
                      {t("calc.confirm.loginHere")}
                    </Link>
                  </p>
                </section>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-6 rounded-xl bg-surface-card p-6 sm:p-8"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="booking-name"
                    label={t("calc.confirm.fullName")}
                    placeholder={t("calc.confirm.fullNamePlaceholder")}
                    autoComplete="name"
                    value={fullName}
                    onChange={setFullName}
                  />

                  <TextField
                    id="booking-phone"
                    label={t("calc.confirm.phone")}
                    placeholder={t("calc.confirm.phonePlaceholder")}
                    autoComplete="tel"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                  />

                  <div className="sm:col-span-2">
                    <TextField
                      id="booking-email"
                      label={t("calc.confirm.email")}
                      placeholder={t("calc.confirm.emailPlaceholder")}
                      autoComplete="email"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      readOnly={Boolean(user)}
                    />
                  </div>

                  {user ? null : (
                    <>
                      <TextField
                        id="booking-password"
                        label={t("common.password")}
                        placeholder={t("calc.confirm.passwordPlaceholder", {
                          values: { count: PASSWORD_MIN_LENGTH },
                        })}
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={setPassword}
                        reveal={{
                          shown: showPassword,
                          toggle: () => setShowPassword((on) => !on),
                        }}
                      />

                      <TextField
                        id="booking-confirm"
                        label={t("calc.confirm.confirmPassword")}
                        placeholder={t("calc.confirm.confirmPasswordPlaceholder")}
                        autoComplete="new-password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        reveal={{
                          shown: showConfirm,
                          toggle: () => setShowConfirm((on) => !on),
                        }}
                      />
                    </>
                  )}

                  {/* The quote carries the day but not the hour, so it is only
                      asked for when the wizard's session handed none over. */}
                  {arrivalTime ? null : (
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label
                        htmlFor="booking-time"
                        className="text-body-sm font-semibold text-text-strong"
                      >
                        {t("calc.confirm.arrivalTime")} <span className="text-brand-red">*</span>
                      </label>

                      <select
                        id="booking-time"
                        className={fieldClass}
                        value={arrivalTime}
                        onChange={(event) => setArrivalTime(event.target.value)}
                      >
                        <option value="">{t("calc.confirm.pickTime")}</option>
                        {ARRIVAL_TIMES.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <hr className="border-border-subtle" />

                <fieldset className="flex flex-col gap-3 border-0 p-0">
                  <legend className="text-body font-bold text-text-strong">
                    {t("calc.confirm.paymentTitle")}
                  </legend>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className="flex cursor-pointer flex-col gap-1 rounded-md border border-border-subtle p-3 transition-colors has-[:checked]:border-brand-red has-[:checked]:bg-surface-page has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-yellow"
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-text-strong">{method.icon}</span>

                          <input
                            type="radio"
                            name="payment"
                            value={method.value}
                            checked={payment === method.value}
                            onChange={() => setPayment(method.value)}
                            className="size-3.5 accent-[var(--color-brand-red)]"
                          />
                        </span>

                        <span className="text-body-sm font-bold text-text-strong">
                          {t(method.labelKey)}
                        </span>
                        <span className="text-caption text-text-default">{t(method.hintKey)}</span>
                      </label>
                    ))}
                  </div>

                  {/* Said out loud rather than implied: nothing is charged here. */}
                  <p className="rounded-md bg-yellow-tint px-3 py-2 text-caption text-text-default">
                    {t("calc.confirm.paymentNotice")}
                  </p>
                </fieldset>

                <hr className="border-border-subtle" />

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 size-[18px] rounded-sm accent-[var(--color-brand-red)]"
                  />

                  <span className="flex flex-col gap-1">
                    <span className="text-body-sm text-text-default">
                      <ConsentSentence />
                    </span>
                    <span className="text-caption text-text-faint">
                      {t("calc.confirm.cancellation")}
                    </span>
                  </span>
                </label>

                <div aria-live="polite">
                  {error ? (
                    <p className="rounded-md border border-danger bg-danger-soft px-4 py-3 text-body-sm text-danger-text">
                      {error}
                    </p>
                  ) : null}
                </div>

                {scheduledDate ? null : (
                  <Notice>
                    {t("calc.confirm.noDate")}{" "}
                    <Link
                      className="font-semibold text-brand-red underline"
                      href={`/${locale}/rechner`}
                    >
                      {t("calc.confirm.backToCalculator")}
                    </Link>
                  </Notice>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-3">
                  <p className="flex items-center gap-2 text-body-sm text-text-default">
                    <IconShield />
                    {t("calc.confirm.ssl")}
                  </p>

                  <button
                    type="submit"
                    className="btn primary large"
                    disabled={!canSubmit || submitting}
                    data-loading={submitting ? "true" : undefined}
                  >
                    {submitting ? t("calc.confirm.submitting") : t("calc.confirm.submit")}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>

        {quote && !reference ? (
          <aside className="flex w-full flex-col gap-6 rounded-xl bg-surface-card p-7 lg:w-[420px] lg:shrink-0">
            <div className="flex flex-col gap-1.5">
              <p className="text-caption font-semibold text-text-default">
                {t("calc.confirm.service")}
              </p>
              <p className="text-h4 font-bold text-text-strong">
                {t(`service.${quote.serviceType}`)}
              </p>
            </div>

            <hr className="border-border-subtle" />

            <dl className="flex flex-col gap-4">
              <SummaryRow
                label={t("calc.confirm.route")}
                value={
                  quote.input.destinationAddress
                    ? `${quote.input.originAddress} → ${quote.input.destinationAddress}`
                    : quote.input.originAddress
                }
                sub={
                  quote.breakdown.distanceKm && Number.parseFloat(quote.breakdown.distanceKm) > 0
                    ? t("calc.confirm.distance", {
                        values: {
                          km: Math.round(Number.parseFloat(quote.breakdown.distanceKm)),
                        },
                      })
                    : undefined
                }
              />

              <SummaryRow
                label={t("calc.confirm.moveDate")}
                value={scheduledDate ? formatDate(scheduledDate) : t("common.none")}
                sub={
                  arrivalTime
                    ? t("calc.confirm.startingAt", { values: { time: arrivalTime } })
                    : undefined
                }
              />

              <SummaryRow
                label={t("calc.confirm.inventory")}
                value={
                  quote.input.calculationMethod === "area"
                    ? t("calc.confirm.areaValue", { values: { area: quote.input.areaSqm ?? 0 } })
                    : t("calc.confirm.itemsValue", { count: countItems(quote.input.selectedItems) })
                }
                sub={
                  quote.breakdown.estimatedHours
                    ? t("calc.confirm.loadingEstimate", {
                        values: { hours: quote.breakdown.estimatedHours },
                      })
                    : undefined
                }
              />

              {quote.serviceType === "moving" ? (
                <SummaryRow
                  label={t("calc.confirm.crew")}
                  value={t("calc.confirm.crewValue", {
                    values: {
                      crew: quote.input.crewSize,
                      vans: quote.input.secondVan ? 2 : 1,
                    },
                  })}
                />
              ) : null}
            </dl>

            <hr className="border-border-subtle" />

            <div className="flex flex-col gap-3">
              <p className="text-caption font-semibold text-text-faint">
                {t("calc.confirm.included")}
              </p>

              {/* The engine's own lines rather than a hand-written list of
                  promises: this is exactly what the stored price pays for. */}
              <ul className="flex flex-col gap-2.5">
                {quote.breakdown.lines.map((line, position) => (
                  <li
                    key={`${line.key}-${position}`}
                    className="flex items-center gap-2 text-body-sm text-text-default"
                  >
                    <span className="text-success">
                      <IconCheck />
                    </span>
                    {t(`line.${line.key.replace("line.", "")}`)}
                  </li>
                ))}
              </ul>
            </div>

            <hr className="border-border-subtle" />

            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex flex-col gap-0.5">
                <p className="text-body font-bold text-text-strong">{t("calc.confirm.total")}</p>
                <p className="text-caption text-text-default">
                  {t("calc.confirm.vatIncluded", { values: { rate: quote.breakdown.vatRate } })}
                </p>
              </div>

              <p className="text-h3 font-extrabold tabular-nums text-text-strong">
                {formatCurrency(quote.breakdown.totalGross)}
              </p>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** The calculator's own 72px header: no marketing nav, and the hotline is the CMS's. */
function CalcHeader() {
  const { t } = useI18n();
  const { phone, brandName } = useSiteSettings();

  return (
    <header className="bg-surface-card">
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 lg:px-10">
        <img src="/images/brand/logo.png" alt={brandName} className="h-[47px] w-auto" />

        {phone ? (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-caption text-text-default">{t("calc.confirm.needHelp")}</span>
              <a className="text-body-sm font-bold text-brand-red" href={telHref(phone)}>
                {phone}
              </a>
            </div>

            <a
              href={telHref(phone)}
              aria-label={t("calc.confirm.callUs")}
              className="grid size-10 place-items-center rounded-full bg-surface-page text-brand-red"
            >
              <IconPhone />
            </a>
          </div>
        ) : null}
      </div>

      {/* The five chips the result frames share. Everything before this screen
          has been answered, so only the last one is current. */}
      <ol className="flex gap-4 overflow-x-auto px-4 lg:gap-8 lg:px-12">
        {TABS.map((key, position) => {
          const current = position === TABS.length - 1;

          return (
            <li
              key={key}
              aria-current={current ? "step" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b pb-3 ${
                current ? "border-brand-red" : "border-transparent"
              }`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full text-caption font-bold ${
                  current ? "bg-brand-red text-text-on-brand" : "bg-success text-text-on-brand"
                }`}
                aria-hidden="true"
              >
                {current ? position + 1 : <IconCheck />}
              </span>

              <span
                className={`text-body-sm font-semibold ${
                  current ? "text-text-strong" : "text-text-default"
                }`}
              >
                {t(key)}
              </span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}

/** The design's field: a 44px sunken box with no border, not the wizard's outlined input. */
const fieldClass =
  "h-11 w-full rounded-md bg-surface-page px-4 text-body text-text-strong " +
  "placeholder:text-text-faint focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-brand-yellow";

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  autoComplete,
  readOnly,
  reveal,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  readOnly?: boolean;
  reveal?: { shown: boolean; toggle: () => void };
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-sm font-semibold text-text-strong">
        {label} <span className="text-brand-red">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          readOnly={readOnly}
          required
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass}${reveal ? " pe-12" : ""}`}
        />

        {reveal ? (
          <button
            type="button"
            onClick={reveal.toggle}
            aria-label={t(reveal.shown ? "calc.confirm.hidePassword" : "calc.confirm.showPassword")}
            className="absolute end-4 top-1/2 -translate-y-1/2 text-text-faint"
          >
            {reveal.shown ? <IconEye /> : <IconEyeOff />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-semibold text-text-faint">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold text-text-strong">{value}</span>
        {sub ? <span className="text-caption text-text-default">{sub}</span> : null}
      </dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-border-subtle bg-surface-card px-6 py-5 text-body text-text-default">
      {children}
    </p>
  );
}

function countItems(items: Record<string, number> | undefined): number {
  return Object.values(items ?? {}).reduce((sum, quantity) => sum + quantity, 0);
}

/* Inline SVG rather than an icon package, as everywhere else in this app. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconPhone() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg {...stroke} width="14" height="14" viewBox="0 0 24 24">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg {...stroke} width="16" height="16" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M10.7 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.9 3.9M6.6 6.6A18 18 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
      <path d="M17 12h.01" />
    </svg>
  );
}

function IconBank() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M3 21h18M4 10h16M5 10V7l7-4 7 4v3M7 10v11M12 10v11M17 10v11" />
    </svg>
  );
}

function IconCash() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
