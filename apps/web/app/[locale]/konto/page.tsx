"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

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

interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  locale: string;
}

/**
 * Profile self-service.
 *
 * Note what cannot be edited here: `role` and `status`. In the previous
 * version the browser wrote straight to the profiles table, so whether a
 * customer could promote themselves to admin depended entirely on how one
 * database policy happened to be written. Those fields now have no path in
 * from a self-edit at all.
 */
export default function AccountPage() {
  const { sdk, user, loading: authLoading, signOut } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace(`/${locale}/login?next=/${locale}/konto`);
      return;
    }

    void (async () => {
      try {
        const me = await sdk.http.get<Profile>("/api/users/me");
        setProfile(me);
        setFullName(me.fullName);
        setPhone(me.phone ?? "");
      } catch {
        setStatus({ kind: "error", text: t("error.profileLoadFailed") });
      }
    })();
  }, [authLoading, user, router, sdk]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const updated = await sdk.http.patch<Profile>("/api/users/me", {
        fullName,
        phone: phone.trim() === "" ? null : phone.trim(),
      });

      setProfile(updated);
      setStatus({ kind: "ok", text: t("common.saved") });
    } catch (caught) {
      // Unlike the legacy code, a failed write is never reported as success:
      // the UI reflects the server's answer, not an optimistic guess.
      setStatus({
        kind: "error",
        text:
          caught instanceof ApiError && caught.code === "VALIDATION_FAILED"
            ? (caught.fieldIssues[0]?.message ?? t("error.checkFields"))
            : t("error.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !profile) {
    return (
      <div className="page-wrap">
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <h1>{t("auth.profileTitle")}</h1>

      <form
        onSubmit={handleSave}
        className="w-full max-w-[520px] rounded-2xl border border-border-subtle bg-surface-card p-8 shadow-lg"
      >
        <div className="field">
          <label htmlFor="email">{t("common.email")}</label>
          {/* Changing an email is an identity change and needs re-verification,
              so it is not a plain profile field. */}
          <input
            id="email"
            className={INPUT_CLASS}
            value={profile.email}
            disabled
            readOnly
          />
          <span className="field-hint">
            Zum Ändern der E-Mail wende dich bitte an den Support.
          </span>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="fullName">{t("common.name")}</label>
          <input
            id="fullName"
            className={INPUT_CLASS}
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="phone">{t("common.phone")}</label>
          <input
            id="phone"
            className={INPUT_CLASS}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>

        <button className="btn primary block large mt-5" disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>

        <div aria-live="polite">
          {status && (
            <div className={status.kind === "ok" ? "calc-success" : "calc-error"}>
              {status.text}
            </div>
          )}
        </div>
      </form>

      <button
        type="button"
        className="btn ghost mt-6"
        onClick={() => void signOut().then(() => router.push(`/${locale}`))}
      >
        {t("nav.logout")}
      </button>
    </div>
  );
}

