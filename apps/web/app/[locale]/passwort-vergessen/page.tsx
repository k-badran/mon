"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Request a password reset link.
 *
 * The login page has linked here since it was written; the route did not exist,
 * so "Passwort vergessen?" was a dead link.
 *
 * The success state deliberately does not confirm that the address is
 * registered. The API answers identically either way — a page that said "we
 * sent you an email" for one address and "no such account" for another would
 * turn this form into an account-enumeration oracle that needs no credentials.
 * So the copy is conditional: *if* an account exists, a link is on its way.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { sdk } = useApi();
  const { t, locale } = useI18n();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await sdk.auth.requestPasswordReset({ email });
      setSent(true);
    } catch (caught) {
      // Only infrastructure failures can land here — a rate limit or an
      // unreachable API. An unknown address is a success by design.
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? t("error.rateLimited")
          : t("error.generic"),
      );
    } finally {
      setLoading(false);
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

          <h1>{t("auth.forgotTitle")}</h1>
          <p className="sub">{t("auth.forgotSub")}</p>

          <div aria-live="polite">
            {error && <div className="auth-alert">{error}</div>}
            {sent && <div className="auth-alert is-info">{t("auth.forgotSent")}</div>}
          </div>

          {/* The form is removed once sent, so the obvious next action is the
              link back rather than submitting the same address again. */}
          {!sent && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="email">{t("common.email")}</label>
                <div className="input-wrap">
                  <MailIcon />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. user@email.com"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              </div>

              <button className="btn primary block" disabled={loading}>
                {loading ? t("auth.forgotSending") : t("auth.forgotSubmit")}
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

function MailIcon() {
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
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
