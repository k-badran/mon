"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { useApi } from "@/lib/api";
import { LOCALE_META, LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The two interactive pieces the nav bar and the footer share.
 *
 * The footer is a server component — it reads the CMS — but the frames give it
 * the same language control and Login link as the header, and both need the
 * browser: one opens a menu, the other knows whether someone is signed in.
 * Keeping them here means the footer stays server-rendered around two small
 * islands, and the header and footer cannot drift apart.
 */

/**
 * "العربية" + globe, from the new nav-bar (86:4671 / 106:10195) and the footer.
 *
 * The frames are drawn in English and label the control "العربية" — the one
 * other language the designer had in mind. The site has four, so a single
 * "switch to" label cannot name all of them. The button shows the language
 * the page is in, in its own script, and opens a menu of all four; that keeps
 * the frame's look (muted native name + globe) while every locale stays one
 * click away.
 */
export function LanguageMenu({
  tone = "light",
  placement = "below",
}: {
  /** "dark" on the inverted footer, where the menu still opens on white. */
  tone?: "light" | "dark";
  /** The footer sits at the bottom of the page, so its menu opens upwards. */
  placement?: "below" | "above";
}) {
  const { t, locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Escape and a click elsewhere close it, the same as the Services menu.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`${t("nav.language")}: ${LOCALE_META[locale].label}`}
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1.5 rounded-md text-body leading-6 whitespace-nowrap text-text-faint transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow ${
          tone === "dark" ? "hover:text-white" : "hover:text-text-strong"
        }`}
      >
        <span lang={locale}>{LOCALE_META[locale].label}</span>
        <Globe />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t("nav.language")}
          className={`absolute end-0 z-40 grid w-44 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg ${
            placement === "above" ? "bottom-full mb-3" : "top-full mt-3"
          }`}
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              lang={code}
              onClick={() => {
                setOpen(false);
                if (code !== locale) setLocale(code);
              }}
              className={`rounded-md px-3 py-2 text-start text-body-sm font-semibold hover:bg-neutral-50 ${
                code === locale ? "text-brand-red" : "text-text-default hover:text-text-strong"
              }`}
            >
              {LOCALE_META[code].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The footer's "Login" (101:92 "Profile"): profile icon + label.
 *
 * Someone already signed in gets their dashboard instead — a Login link that
 * leads back to a sign-in form they have already passed would be a dead end.
 */
export function AccountLink({ className }: { className?: string }) {
  const { user, loading } = useApi();
  const { t, locale } = useI18n();

  // Reserve the slot while the session resolves, so the row does not jump.
  if (loading) return <span aria-hidden="true" className="inline-block h-[42px] w-[76px]" />;

  return (
    <Link href={`/${locale}${user ? "/dashboard" : "/login"}`} className={className}>
      <ProfileIcon />
      {t(user ? "nav.profile" : "nav.login")}
    </Link>
  );
}

/** vuesax/linear/global, 20px, 1px stroke. */
export function Globe() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
      <path d="M8 3h1a28.4 28.4 0 0 0 0 18H8M15 3a28.4 28.4 0 0 1 0 18" />
      <path d="M3 16v-1a28.4 28.4 0 0 0 18 0v1M3 9a28.4 28.4 0 0 1 18 0" />
    </svg>
  );
}

/** vuesax/linear/profile, 18px, 1.5px stroke. */
export function ProfileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.16 10.87a1.8 1.8 0 0 0-.33 0 4.42 4.42 0 0 1-4.27-4.43A4.43 4.43 0 0 1 12 2a4.43 4.43 0 0 1 .16 8.87Z" />
      <path d="M7.16 14.56c-2.42 1.62-2.42 4.26 0 5.87 2.75 1.84 7.26 1.84 10.01 0 2.42-1.62 2.42-4.26 0-5.87-2.74-1.83-7.25-1.83-10.01 0Z" />
    </svg>
  );
}
