"use client";

import { PASSWORD_MIN_LENGTH } from "@mon/core";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Set a new password from an emailed link.
 *
 * The token arrives in the query string, which is why this is the one auth page
 * that needs `useSearchParams`.
 *
 * No session is issued on success and the page sends the visitor to sign in
 * instead. Whoever completed this proved control of the mailbox, not of the
 * account — signing them straight in would make a compromised inbox a
 * compromised account with no further step. The API takes the same position.
 */
function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const { sdk } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();
  const token = useSearchParams().get("token");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    // Checked here as well as by the API, because catching it before the request
    // keeps a mistyped confirmation from spending one of the rate-limited
    // attempts on the reset endpoint.
    if (password !== confirmation) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (!token) {
      setError(t("auth.linkMissing"));
      return;
    }

    setLoading(true);

    try {
      await sdk.auth.confirmPasswordReset({ token, newPassword: password });
      setDone(true);
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => router.push(`/${locale}/login`), 2500);
    } catch (caught) {
      setLoading(false);

      if (!(caught instanceof ApiError)) {
        setError(t("error.generic"));
        return;
      }

      switch (caught.code) {
        // The API answers INVALID_INPUT for a token that is unknown, already
        // used or expired — deliberately one message for all three, since
        // telling them apart would say whether a token ever existed.
        case "INVALID_INPUT":
          setError(t("auth.linkInvalid"));
          break;
        case "VALIDATION_FAILED":
          setError(t("auth.passwordHint", { values: { min: PASSWORD_MIN_LENGTH } }));
          break;
        case "RATE_LIMITED":
          setError(t("error.rateLimited"));
          break;
        default:
          setError(t("error.generic"));
      }
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-panel">
        <div className="auth-panel-inner">
          <h2>{t("auth.panelHeadline")}</h2>
          <p>{t("auth.panelBody")}</p>
        </div>
        <p className="auth-panel-foot">
          © {new Date().getFullYear()} m.on GmbH. {t("footer.rights")}
        </p>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form">
          <img className="auth-logo" src="/images/logo.svg" alt="m.on" />

          <h1>{t("auth.resetTitle")}</h1>
          <p className="sub">{t("auth.resetSub")}</p>

          <div aria-live="polite">
            {error && <div className="auth-alert">{error}</div>}
            {done && <div className="auth-alert is-info">{t("auth.resetDone")}</div>}
            {/* Said up front rather than on submit: a visitor who reached this
                page without a token should not fill in a form first. */}
            {!token && !done && !error && (
              <div className="auth-alert">{t("auth.linkMissing")}</div>
            )}
          </div>

          {!done && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="password">{t("common.password")}</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={PASSWORD_MIN_LENGTH}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    aria-invalid={Boolean(error)}
                  />
                  <button
                    type="button"
                    className="reveal"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? t("auth.hide") : t("auth.show")}
                  </button>
                </div>
                <small className="hint">
                  {t("auth.passwordHint", { values: { min: PASSWORD_MIN_LENGTH } })}
                </small>
              </div>

              <div className="field">
                <label htmlFor="confirmation">{t("auth.confirmPassword")}</label>
                <div className="input-wrap">
                  <LockIcon />
                  <input
                    id="confirmation"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="••••••••"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              </div>

              <button className="btn primary block" disabled={loading || !token}>
                {loading ? t("auth.resetSaving") : t("auth.resetSubmit")}
              </button>
            </form>
          )}

          <p className="auth-switch">
            <Link href={`/${locale}/login`}>{t("auth.backToLogin")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="auth-split">
          <aside className="auth-panel" />
          <main className="auth-form-side" aria-busy="true" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function LockIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="lead-icon"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}
