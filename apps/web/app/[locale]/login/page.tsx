"use client";

import { isStaffRole } from "@mon/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { AuthLogo } from "@/app/components/site/AuthLogo";

/**
 * Sign in.
 *
 * The split layout from the brand reference: a red panel carrying the promise,
 * and a quiet form beside it. The panel is hidden below 900px, where the logo
 * takes over the branding job and the form gets the whole screen.
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

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNeedsConfirmation(false);
    setLoading(true);

    try {
      const user = await signIn(email, password);
      const next = nextDestination();

      // Staff land on the board they actually work in; customers on theirs.
      // Asked by rank rather than by naming roles, so operator and
      // customer_service are not silently treated as customers.
      router.push(
        next ??
          `/${locale}${isStaffRole(user.role) ? "/admin" : "/dashboard"}`,
      );
      router.refresh();
    } catch (caught) {
      setLoading(false);

      if (!(caught instanceof ApiError)) {
        setError(t("error.generic"));
        return;
      }

      // Branching on the machine-readable code, never the message text.
      switch (caught.code) {
        case "INVALID_CREDENTIALS":
          setError(t("error.invalidCredentials"));
          break;
        case "EMAIL_NOT_VERIFIED":
          setNeedsConfirmation(true);
          break;
        case "ACCOUNT_BLOCKED":
          setError(t("error.accountBlocked"));
          break;
        case "RATE_LIMITED":
          setError(t("error.rateLimited"));
          break;
        case "NETWORK_ERROR":
          setError(t("error.network"));
          break;
        default:
          setError(t("error.generic"));
      }
    }
  }

  const year = new Date().getFullYear();

  return (
    <div className="auth-split">
      <aside className="auth-panel">
        <div className="auth-panel-inner">
          <h2>{t("auth.panelHeadline")}</h2>
          <p>{t("auth.panelBody")}</p>

          <div className="auth-badges">
            <span className="auth-badge">
              <ShieldIcon />
              {t("auth.badgeInsured")}
            </span>
            <span className="auth-badge">
              <StarIcon />
              {t("auth.badgeRating")}
            </span>
          </div>
        </div>

        <p className="auth-panel-foot">
          © {year} m.on GmbH. {t("footer.rights")}
        </p>
      </aside>

      <main className="auth-form-side">
        <div className="auth-form">
          <AuthLogo />

          <h1>{t("auth.welcomeBack")}</h1>
          <p className="sub">{t("auth.loginSub")}</p>

          {/* Announced, so a screen reader hears the failure rather than only
              seeing it repaint. */}
          <div aria-live="polite">
            {error && <div className="auth-alert">{error}</div>}
            {needsConfirmation && (
              <div className="auth-alert is-info">{t("error.emailNotVerified")}</div>
            )}
          </div>

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

            <div className="field">
              <label htmlFor="password">{t("common.password")}</label>
              <div className="input-wrap">
                <LockIcon />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
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
            </div>

            <Link className="forgot" href={`/${locale}/passwort-vergessen`}>
              {t("auth.forgotPassword")}
            </Link>

            <button className="btn primary block" disabled={loading}>
              {loading ? t("auth.loggingIn") : t("auth.loginSubmit")}
            </button>
          </form>

          <p className="auth-alt">
            <Link href={`/${locale}/code-anmeldung`}>{t("auth.otpLink")}</Link>
          </p>

          <div className="auth-divider">{t("auth.orContinueWith")}</div>

          {/*
            Social sign-in is not wired to a provider yet. The buttons are
            disabled rather than absent, because the layout was designed with
            them and hiding them would silently change it — and a button that
            looks live but does nothing is worse than one that says it is not.
          */}
          <div className="auth-social">
            <button type="button" disabled title={t("auth.comingSoon")}>
              <GoogleIcon />
              Google
            </button>
            <button type="button" disabled title={t("auth.comingSoon")}>
              <AppleIcon />
              Apple
            </button>
          </div>

          <p className="auth-switch">
            {t("auth.noAccount")}{" "}
            <Link href={`/${locale}/signup`}>{t("nav.signup")}</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return <LoginForm />;
}

// ── Icons ─────────────────────────────────────────────────────────────

const stroke = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function MailIcon() {
  return (
    <svg {...stroke} className="lead-icon">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...stroke} className="lead-icon">
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...stroke} width={15} height={15}>
      <path d="M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.9 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.1-1.5 2.7-.4 6.6 1.1 8.8.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.2-.9-2.2-3.4zM14.2 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2z" />
    </svg>
  );
}
