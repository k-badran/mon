"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

type State = "checking" | "done" | "invalid" | "missing";

/**
 * Confirm an email address from the emailed link.
 *
 * Runs on mount rather than behind a button: the visitor already expressed
 * intent by clicking the link in their inbox, and asking them to confirm the
 * confirmation is a step that exists only to serve the implementation.
 *
 * Unauthenticated by design — the link is opened from a mail client, often on a
 * device that has never signed in, so the token is the proof.
 */
function VerifyEmail() {
  const [state, setState] = useState<State>("checking");
  const [resent, setResent] = useState(false);

  const { sdk, user } = useApi();
  const { t, locale } = useI18n();
  const token = useSearchParams().get("token");

  /**
   * React 18 mounts effects twice in development. The token is single-use, so
   * the second run would consume nothing and report the link as invalid on a
   * confirmation that had just succeeded. The ref makes the call happen once.
   */
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    if (!token) {
      setState("missing");
      return;
    }

    sdk.auth
      .verifyEmail({ token })
      .then(() => setState("done"))
      .catch(() => setState("invalid"));
  }, [sdk, token]);

  async function handleResend() {
    try {
      await sdk.auth.sendVerification();
      setResent(true);
    } catch (caught) {
      // Already confirmed is a success from the visitor's point of view: the
      // thing they wanted is true. Anything else stays quiet rather than
      // showing a second error on a page that is already showing one.
      if (caught instanceof ApiError && caught.code === "CONFLICT") setState("done");
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

          <h1>{t("auth.verifyTitle")}</h1>

          <div aria-live="polite">
            {state === "checking" && <p className="sub">{t("auth.verifyChecking")}</p>}
            {state === "done" && (
              <div className="auth-alert is-info">{t("auth.verifyDone")}</div>
            )}
            {state === "invalid" && <div className="auth-alert">{t("auth.linkInvalid")}</div>}
            {state === "missing" && <div className="auth-alert">{t("auth.linkMissing")}</div>}
            {resent && <div className="auth-alert is-info">{t("auth.verifySent")}</div>}
          </div>

          {/*
            Offered only to a signed-in visitor whose link failed. Re-sending
            needs a session — the endpoint takes the address from the token, not
            from a form, so that it cannot be used to mail arbitrary people.
          */}
          {state !== "done" && state !== "checking" && user && !resent && (
            <button type="button" className="btn primary block" onClick={handleResend}>
              {t("auth.verifyResend")}
            </button>
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
      <VerifyEmail />
    </Suspense>
  );
}
