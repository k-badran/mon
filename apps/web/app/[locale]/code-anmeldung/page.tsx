"use client";

import { isStaffRole } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { AuthLogo } from "@/app/components/site/AuthLogo";

/**
 * Sign in with a one-time code instead of a password.
 *
 * Two steps in one route rather than two: the address typed in step one is the
 * address step two verifies against, and carrying it through a navigation means
 * either putting it in the URL — where it lands in history and server logs — or
 * holding it in storage. Local state is the smaller answer.
 *
 * The "code sent" message is conditional on purpose. The API answers the same
 * for a registered and an unregistered address, so claiming a code was sent
 * would be a claim this page cannot make, and a page that only says it for real
 * accounts is an enumeration oracle.
 */
/**
 * Reads the `next` destination from the URL, at the moment it is needed.
 *
 * Deliberately not `useSearchParams()`. That hook opts the whole subtree out of
 * prerendering, so the route shipped an empty shell: no logo, no form, no copy
 * in the server-rendered HTML — a blank flash before hydration, and nothing for
 * a crawler to index on the page most likely to be linked to.
 *
 * The destination is only consulted inside the submit handler, which by
 * definition runs in the browser after a click, so reading `window.location`
 * there costs nothing and lets the page render on the server like any other.
 */
function nextDestination(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

function OtpLogin() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [notDelivered, setNotDelivered] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { sdk, signInWithCode } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const challenge = await sdk.auth.requestOtp({ email });
      // Surfaced so a developer running with MAIL_DRIVER=log is told the mail
      // was only recorded, instead of watching an inbox that will stay empty.
      setNotDelivered(!challenge.delivered);
      setStage("code");
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "RATE_LIMITED"
          ? t("error.rateLimited")
          : t("error.generic"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Goes through the provider, not the SDK directly: it is what stores the
      // token pair the rest of the app authenticates with.
      const user = await signInWithCode(email, code);

      const next = nextDestination();
      // Asked by rank rather than by naming roles, so operator and
      // customer_service are not silently treated as customers.
      router.push(next ?? `/${locale}${isStaffRole(user.role) ? "/admin" : "/dashboard"}`);
      router.refresh();
    } catch (caught) {
      setLoading(false);

      if (!(caught instanceof ApiError)) {
        setError(t("error.generic"));
        return;
      }

      switch (caught.code) {
        // One message for a wrong code, an expired one and a code that has
        // burned its attempt budget — telling them apart would say how close a
        // guess was and whether the address is registered.
        case "INVALID_CREDENTIALS":
          setError(t("auth.otpInvalid"));
          break;
        case "VALIDATION_FAILED":
          setError(t("error.checkFields"));
          break;
        case "ACCOUNT_BLOCKED":
          setError(t("error.accountBlocked"));
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
          <AuthLogo />

          <h1>{t("auth.otpTitle")}</h1>
          <p className="sub">{t("auth.otpSub")}</p>

          <div aria-live="polite">
            {error && <div className="auth-alert">{error}</div>}
            {stage === "code" && !error && (
              <div className="auth-alert is-info">{t("auth.otpSent")}</div>
            )}
            {notDelivered && <div className="auth-alert">{t("auth.otpNotDelivered")}</div>}
          </div>

          {stage === "email" ? (
            <form onSubmit={requestCode} noValidate>
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
                {loading ? t("auth.forgotSending") : t("auth.otpRequest")}
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <div className="field">
                <label htmlFor="code">{t("auth.otpCode")}</label>
                <div className="input-wrap">
                  {/*
                    `inputMode="numeric"` brings up the digit keypad on a phone,
                    and `dir="ltr"` keeps the digits in the order they were
                    issued even when the page itself is right-to-left — a
                    reordered code is one the server never sent.
                    `autoComplete="one-time-code"` lets iOS and Android offer the
                    code straight from the notification.
                  */}
                  <input
                    id="code"
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    aria-invalid={Boolean(error)}
                    autoFocus
                  />
                </div>
              </div>

              <button className="btn primary block" disabled={loading || code.length < 6}>
                {loading ? t("auth.otpVerifying") : t("auth.otpVerify")}
              </button>

              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setError("");
                  setNotDelivered(false);
                }}
              >
                {t("auth.otpChangeEmail")}
              </button>
            </form>
          )}

          <p className="auth-switch">
            <Link href={`/${locale}/login`}>{t("auth.passwordLink")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return <OtpLogin />;
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
