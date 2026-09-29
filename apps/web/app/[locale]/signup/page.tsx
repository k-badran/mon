"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/** Mirrors the server's policy, so the form can say so before submitting. */

/**
 * The field look the login screen gets from `.input-wrap input` in site.css.
 * That rule is written around a leading icon and reserves a 40px gutter for
 * one; these fields have no icon, so they carry the same design as utilities
 * rather than inherit space for a glyph that is not there.
 */
const INPUT_CLASS =
  "w-full rounded-md border border-border-default bg-surface-card p-3 text-body " +
  "text-text-strong transition-colors placeholder:text-text-faint " +
  "focus:border-brand-red focus:ring-3 focus:ring-red-100 focus:outline-none " +
  "aria-[invalid=true]:border-danger disabled:bg-surface-sunken disabled:text-text-muted";

function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const { signUp } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  // A quote calculated before signing up is carried through, so the price the
  // visitor just saw survives account creation instead of being retyped —
  // the biggest drop-off point in the old funnel.
  const quoteId = searchParams.get("quote") ?? undefined;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      await signUp({
        fullName,
        email,
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(quoteId ? { quoteId } : {}),
      });

      // Straight back to the quote when there is one, so the flow continues
      // where it left off.
      router.push(quoteId ? `/${locale}?quote=${quoteId}` : `/${locale}`);
      router.refresh();
    } catch (caught) {
      setLoading(false);

      if (!(caught instanceof ApiError)) {
        setError(t("error.generic"));
        return;
      }

      if (caught.code === "EMAIL_TAKEN") {
        setFieldErrors({ email: t("error.emailTaken") });
        return;
      }

      if (caught.code === "VALIDATION_FAILED") {
        // Field-level messages from the server land on the right inputs.
        setFieldErrors(
          Object.fromEntries(caught.fieldIssues.map((issue) => [issue.path, issue.message])),
        );
        return;
      }

      setError(
        caught.code === "RATE_LIMITED"
          ? t("error.rateLimited")
          : t("error.generic"),
      );
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-[420px] rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-lg">
        <h1 className="font-display text-h3 font-bold text-text-strong">
          {t("auth.signupTitle")}
        </h1>
        <p className="auth-sub">
          {quoteId
            ? t("auth.signupWithQuote")
            : t("auth.signupSub")}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="fullName">{t("common.name")}</label>
            <input
              id="fullName"
              className={INPUT_CLASS}
              autoComplete="name"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName && <span className="field-error">{fieldErrors.fullName}</span>}
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="email">{t("common.email")}</label>
            <input
              id="email"
              className={INPUT_CLASS}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="phone">{t("common.phone")} ({t("common.optional")})</label>
            <input
              id="phone"
              className={INPUT_CLASS}
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="password">{t("common.password")}</label>
            <input
              id="password"
              className={INPUT_CLASS}
              type="password"
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-hint"
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <span id="password-hint" className="field-hint">
              {t("auth.passwordHint", { values: { min: PASSWORD_MIN_LENGTH } })}
            </span>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <button className="btn primary block large mt-5" disabled={loading}>
            {loading ? t("auth.creatingAccount") : t("auth.signupSubmit")}
          </button>

          <div aria-live="polite">{error && <div className="calc-error">{error}</div>}</div>
        </form>

        <p className="auth-switch">
          {t("auth.hasAccount")} <Link href={`/${locale}/login`}>{t("nav.login")}</Link>
        </p>
      </div>
    </div>
  );
}


/**
 * The query string decides where to return the user, and which quote to carry
 * through, so the form must be client-rendered. The boundary keeps that scoped
 * to the form rather than the whole route.
 */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
          <div
            className="min-h-[28rem] w-full max-w-[420px] rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-lg"
            aria-busy="true"
          />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
