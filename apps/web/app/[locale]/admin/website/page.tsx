"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isSafeImageSrc } from "@mon/core";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";

/**
 * Website control.
 *
 * Changes the live site's colours, branding, contact details and marketing copy
 * without a deploy. Three things make handing that out reasonable:
 *
 *   - **Every field is typed.** A colour input cannot hold prose; the server
 *     re-validates, so the constraint is not merely a UI affordance.
 *   - **The theme can always be reset.** A bad contrast choice is one button
 *     away from being undone, not a database edit.
 *   - **Every change is audited.** A theme edit is visible to every visitor, so
 *     who made it and what it was before are recorded.
 *
 * Deliberately absent: prices, legal pages, and anything the pricing engine
 * reads. A typo in a rate card is a billing incident, and terms are a legal
 * document — neither belongs behind a free text box.
 */

type Group = "theme" | "brand" | "contact" | "seo";

interface Setting {
  key: string;
  value: string;
  group: Group;
  kind: "color" | "text" | "textarea" | "url" | "email" | "number" | "boolean" | "image";
  label: string;
  description: string | null;
  sortOrder: number;
}

interface ContentBlock {
  id: string;
  section: string;
  slot: string;
  locale: string;
  value: string;
  /** "text", "textarea" or "image" (a photo's path or https URL). */
  kind: string;
  label: string;
  isPublished: boolean;
}

type Tab = "theme" | "brand" | "contact" | "seo" | "content";

export default function WebsiteControlPage() {
  const { sdk } = useApi();
  const { t, locale } = useI18n();

  const [tab, setTab] = useState<Tab>("theme");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [contentLocale, setContentLocale] = useState(locale);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([
        sdk.http.get<{ settings: Setting[] }>("/api/site/settings"),
        sdk.http.get<{ blocks: ContentBlock[] }>("/api/site/blocks", { locale: contentLocale }),
      ]);

      setSettings(s.settings);
      setBlocks(b.blocks);
    } catch {
      setStatus({ kind: "error", text: t("site.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [sdk, contentLocale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSetting(key: string, value: string) {
    setSavingKey(key);
    setStatus(null);

    try {
      await sdk.http.patch(`/api/site/settings/${key}`, { value });
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
      setStatus({ kind: "ok", text: t("site.saved") });
    } catch (caught) {
      // The server's message names the actual constraint — "expected a hex
      // colour" is more useful than a generic failure.
      setStatus({
        kind: "error",
        text: caught instanceof ApiError ? caught.message : t("error.saveFailed"),
      });
      await load();
    } finally {
      setSavingKey(null);
    }
  }

  async function saveBlock(id: string, patch: { value?: string; isPublished?: boolean }) {
    setSavingKey(id);
    setStatus(null);

    try {
      await sdk.http.patch(`/api/site/blocks/${id}`, patch);
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
      setStatus({ kind: "ok", text: t("site.saved") });
    } catch (caught) {
      setStatus({
        kind: "error",
        text: caught instanceof ApiError ? caught.message : t("error.saveFailed"),
      });
    } finally {
      setSavingKey(null);
    }
  }

  /** Puts an image block back to the photo the page shipped with. */
  async function resetBlock(id: string) {
    setSavingKey(id);
    setStatus(null);

    try {
      const updated = await sdk.http.post<ContentBlock>(`/api/site/blocks/${id}/reset`);
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, value: updated.value } : b)));
      setStatus({ kind: "ok", text: t("site.image.wasReset") });
    } catch (caught) {
      setStatus({
        kind: "error",
        text: caught instanceof ApiError ? caught.message : t("error.saveFailed"),
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function resetTheme() {
    setResetting(true);

    try {
      await sdk.http.post("/api/site/settings/reset-theme");
      await load();
      setStatus({ kind: "ok", text: t("site.themeReset") });
    } catch {
      setStatus({ kind: "error", text: t("error.saveFailed") });
    } finally {
      setResetting(false);
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, Setting[]> = {};
    for (const setting of settings) (map[setting.group] ??= []).push(setting);
    return map;
  }, [settings]);

  const bySection = useMemo(() => {
    const map: Record<string, ContentBlock[]> = {};
    for (const block of blocks) (map[block.section] ??= []).push(block);
    return map;
  }, [blocks]);

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: "theme", label: t("site.tab.theme") },
    { id: "brand", label: t("site.tab.brand") },
    { id: "contact", label: t("site.tab.contact") },
    { id: "seo", label: t("site.tab.seo") },
    { id: "content", label: t("site.tab.content") },
  ];

  return (
    <DashboardShell title={t("site.title")} variant="staff">
      <p style={{ color: "var(--text-muted)", margin: 0, maxInlineSize: "68ch" }}>
        {t("site.lead")}
      </p>

      {/* Live feedback sits at the top, announced, rather than beside whichever
          field was edited. */}
      <div aria-live="polite">
        {status && (
          <div
            className="card"
            style={{
              borderColor: status.kind === "ok" ? "var(--success)" : "var(--danger)",
              background: status.kind === "ok" ? "var(--success-soft)" : "var(--danger-soft)",
              padding: "var(--space-3) var(--space-4)",
            }}
          >
            {status.text}
          </div>
        )}
      </div>

      <div role="tablist" aria-label={t("site.title")} style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "btn primary small" : "btn ghost small"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: "grid", gap: "var(--space-3)" }} aria-busy="true">
          <div className="skeleton" style={{ blockSize: 64 }} />
          <div className="skeleton" style={{ blockSize: 64 }} />
          <div className="skeleton" style={{ blockSize: 64 }} />
        </div>
      )}

      {/* ── Settings tabs ───────────────────────────────────────────── */}
      {!loading && tab !== "content" && (
        <section className="card">
          <div className="card-head">
            <h2>{TABS.find((item) => item.id === tab)?.label}</h2>

            {tab === "theme" && (
              <button
                type="button"
                className="btn ghost small"
                onClick={() => void resetTheme()}
                disabled={resetting}
              >
                {resetting ? t("common.saving") : t("site.resetTheme")}
              </button>
            )}
          </div>

          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            {(grouped[tab] ?? []).map((setting) => (
              <SettingField
                key={setting.key}
                setting={setting}
                saving={savingKey === setting.key}
                onSave={(value) => void saveSetting(setting.key, value)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Content tab ─────────────────────────────────────────────── */}
      {!loading && tab === "content" && (
        <>
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <label htmlFor="content-locale" style={{ fontWeight: 600, color: "var(--text-strong)" }}>
              {t("nav.language")}
            </label>
            <select
              id="content-locale"
              value={contentLocale}
              onChange={(event) => setContentLocale(event.target.value as typeof locale)}
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
              }}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="tr">Türkçe</option>
            </select>

            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              {t("site.contentHint")}
            </span>
          </div>

          {Object.entries(bySection).map(([section, sectionBlocks]) => (
            <section className="card" key={section}>
              <div className="card-head">
                <h2>{t(`site.section.${section}`)}</h2>
              </div>

              <div style={{ display: "grid", gap: "var(--space-5)" }}>
                {sectionBlocks.map((block) => (
                  <BlockField
                    key={block.id}
                    block={block}
                    saving={savingKey === block.id}
                    publishedLabel={t("site.published")}
                    onSave={(patch) => void saveBlock(block.id, patch)}
                    onReset={() => void resetBlock(block.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </DashboardShell>
  );
}

/** One setting, rendered by its declared kind. */
function SettingField({
  setting,
  saving,
  onSave,
}: {
  setting: Setting;
  saving: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(setting.value);
  const dirty = draft !== setting.value;

  useEffect(() => setDraft(setting.value), [setting.value]);

  const inputId = `setting-${setting.key}`;

  return (
    <div>
      <label htmlFor={inputId} style={{ display: "block", fontWeight: 600, color: "var(--text-strong)", marginBlockEnd: 4 }}>
        {setting.label}
      </label>

      {setting.description && (
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {setting.description}
        </p>
      )}

      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
        {setting.kind === "color" ? (
          <>
            {/* A native colour picker alongside the hex field: the picker for
                choosing, the text field for pasting an exact brand value. */}
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(draft) ? draft : "#000000"}
              onChange={(event) => setDraft(event.target.value.toUpperCase())}
              aria-label={`${setting.label} — picker`}
              style={{ inlineSize: 44, blockSize: 40, padding: 2, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--surface-card)" }}
            />
            <input
              id={inputId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              style={{ inlineSize: 130, fontFamily: "ui-monospace, monospace", padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
            />
          </>
        ) : setting.kind === "textarea" ? (
          <textarea
            id={inputId}
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            style={{ flex: 1, minInlineSize: 280, padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "inherit" }}
          />
        ) : (
          <input
            id={inputId}
            type={setting.kind === "number" ? "number" : setting.kind === "email" ? "email" : "text"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{ flex: 1, minInlineSize: 240, padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
          />
        )}

        {/* Save appears only when there is something to save, so the form does
            not look like a wall of pending actions. */}
        {dirty && (
          <button type="button" className="btn primary small" onClick={() => onSave(draft)} disabled={saving}>
            {saving ? "…" : "✓"}
          </button>
        )}
        {dirty && (
          <button type="button" className="btn ghost small" onClick={() => setDraft(setting.value)} disabled={saving}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function BlockField({
  block,
  saving,
  publishedLabel,
  onSave,
  onReset,
}: {
  block: ContentBlock;
  saving: boolean;
  publishedLabel: string;
  onSave: (patch: { value?: string; isPublished?: boolean }) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(block.value);
  const dirty = draft !== block.value;

  useEffect(() => setDraft(block.value), [block.value]);

  const inputId = `block-${block.id}`;

  if (block.kind === "image") {
    return (
      <ImageBlockField
        block={block}
        draft={draft}
        setDraft={setDraft}
        dirty={dirty}
        saving={saving}
        publishedLabel={publishedLabel}
        onSave={onSave}
        onReset={onReset}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBlockEnd: 4 }}>
        <label htmlFor={inputId} style={{ fontWeight: 600, color: "var(--text-strong)" }}>
          {block.label}
        </label>
        <code style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{block.slot}</code>

        <label style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={block.isPublished}
            onChange={(event) => onSave({ isPublished: event.target.checked })}
            disabled={saving}
          />
          {publishedLabel}
        </label>
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-start" }}>
        {block.kind === "textarea" ? (
          <textarea
            id={inputId}
            value={draft}
            rows={3}
            onChange={(event) => setDraft(event.target.value)}
            dir={block.locale === "ar" ? "rtl" : "ltr"}
            style={{ flex: 1, padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "inherit" }}
          />
        ) : (
          <input
            id={inputId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            dir={block.locale === "ar" ? "rtl" : "ltr"}
            style={{ flex: 1, padding: "var(--space-2) var(--space-3)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
          />
        )}

        {dirty && (
          <>
            <button type="button" className="btn primary small" onClick={() => onSave({ value: draft })} disabled={saving}>
              {saving ? "…" : "✓"}
            </button>
            <button type="button" className="btn ghost small" onClick={() => setDraft(block.value)} disabled={saving}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A photo slot: a path or URL field beside a live thumbnail of what it points at.
 *
 * There is no upload yet — the site has no file storage — so the field takes
 * a file already shipped under `/images/` or an https URL. The same rule the
 * API enforces is checked as the editor types, so a bad value is flagged
 * before a round trip rather than after. The photo is the same in every
 * language: saving here changes it on all four locales' pages at once.
 */
function ImageBlockField({
  block,
  draft,
  setDraft,
  dirty,
  saving,
  publishedLabel,
  onSave,
  onReset,
}: {
  block: ContentBlock;
  draft: string;
  setDraft: (value: string) => void;
  dirty: boolean;
  saving: boolean;
  publishedLabel: string;
  onSave: (patch: { value?: string; isPublished?: boolean }) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const [broken, setBroken] = useState(false);

  const trimmed = draft.trim();
  const valid = isSafeImageSrc(trimmed);

  // A new value gets a fresh chance to load.
  useEffect(() => setBroken(false), [trimmed]);

  const inputId = `block-${block.id}`;
  const hintId = `${inputId}-hint`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBlockEnd: 4 }}>
        <label htmlFor={inputId} style={{ fontWeight: 600, color: "var(--text-strong)" }}>
          {block.label}
        </label>
        <code style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>{block.slot}</code>

        <label style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={block.isPublished}
            onChange={(event) => onSave({ isPublished: event.target.checked })}
            disabled={saving}
          />
          {publishedLabel}
        </label>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* The thumbnail shows the draft, not the saved value, so the editor
            sees the photo before committing to it. */}
        <div
          style={{
            inlineSize: 160,
            blockSize: 100,
            flexShrink: 0,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-default)",
            background: "var(--surface-sunken)",
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
          }}
        >
          {valid && !broken ? (
            <img
              src={trimmed}
              alt=""
              onError={() => setBroken(true)}
              style={{ inlineSize: "100%", blockSize: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-faint)", padding: "var(--space-2)", textAlign: "center" }}>
              {valid ? t("site.image.broken") : t("site.image.invalid")}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minInlineSize: 240, display: "grid", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            {/* Paths and URLs read left to right in every locale. */}
            <input
              id={inputId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              dir="ltr"
              spellCheck={false}
              inputMode="url"
              aria-describedby={hintId}
              aria-invalid={!valid}
              style={{
                flex: 1,
                fontFamily: "ui-monospace, monospace",
                padding: "var(--space-2) var(--space-3)",
                border: `1px solid ${valid ? "var(--border-default)" : "var(--danger)"}`,
                borderRadius: "var(--radius-md)",
              }}
            />

            {dirty && (
              <>
                <button
                  type="button"
                  className="btn primary small"
                  onClick={() => onSave({ value: trimmed })}
                  disabled={saving || !valid}
                >
                  {saving ? "…" : "✓"}
                </button>
                <button type="button" className="btn ghost small" onClick={() => setDraft(block.value)} disabled={saving}>
                  ✕
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
            <span id={hintId} style={{ fontSize: "var(--text-sm)", color: valid ? "var(--text-muted)" : "var(--danger)" }}>
              {valid ? t("site.image.hint") : t("site.image.invalid")}
            </span>

            <button
              type="button"
              className="btn ghost small"
              onClick={onReset}
              disabled={saving}
              style={{ marginInlineStart: "auto" }}
            >
              {t("site.image.reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
