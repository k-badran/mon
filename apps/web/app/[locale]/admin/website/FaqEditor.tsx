"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_FAQ_CATEGORY, FAQ_CATEGORIES, toFaqCategory, type FaqCategory } from "@mon/core";

import { ApiError, useApi } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The FAQ tab of the Website editor.
 *
 * The questions are rows of their own (`faq_entries`), not content blocks, so
 * they get their own list rather than a section under "Content": an editor
 * adds and removes questions and changes their order, which a fixed set of
 * slots cannot do.
 *
 * Every write goes straight to the API and the list is replaced with what the
 * server answers, never patched optimistically — the order in particular is
 * the server's, since two editors reordering at once is exactly when a local
 * guess would be wrong.
 */

interface FaqEntry {
  id: string;
  locale: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isPublished: boolean;
}

type Status = { kind: "ok" | "error"; text: string };

const LOCALE_OPTIONS: Array<{ code: Locale; label: string }> = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "tr", label: "Türkçe" },
];

const control = {
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontFamily: "inherit",
} as const;

/** The API's own bounds, checked here to spare a round trip. */
function tooShort(question: string, answer: string): boolean {
  return question.trim().length < 3 || answer.trim().length < 3;
}

export function FaqEditor({ onStatus }: { onStatus: (status: Status | null) => void }) {
  const { sdk } = useApi();
  const { t, locale } = useI18n();

  const [faqLocale, setFaqLocale] = useState<Locale>(locale);
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<FaqEntry | null>(null);

  const fail = useCallback(
    (caught: unknown) =>
      onStatus({
        kind: "error",
        text: caught instanceof ApiError ? caught.message : t("error.saveFailed"),
      }),
    [onStatus, t],
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const payload = await sdk.http.get<{ entries: FaqEntry[] }>("/api/faq/all", { locale: faqLocale });
      setEntries(payload.entries);
    } catch {
      onStatus({ kind: "error", text: t("site.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, [sdk, faqLocale, onStatus, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(entry: FaqEntry, patch: Partial<Pick<FaqEntry, "question" | "answer" | "category" | "isPublished">>) {
    setBusyId(entry.id);
    onStatus(null);

    try {
      const updated = await sdk.http.patch<FaqEntry>(`/api/faq/${entry.id}`, patch);
      setEntries((prev) => prev.map((item) => (item.id === entry.id ? updated : item)));
      onStatus({ kind: "ok", text: t("site.saved") });
    } catch (caught) {
      fail(caught);
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= entries.length) return;

    const ids = entries.map((entry) => entry.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];

    setBusyId(entries[index]!.id);
    onStatus(null);

    try {
      const payload = await sdk.http.post<{ entries: FaqEntry[] }>("/api/faq/reorder", {
        locale: faqLocale,
        ids,
      });
      setEntries(payload.entries);
      onStatus({ kind: "ok", text: t("site.faq.reordered") });
    } catch (caught) {
      fail(caught);
      // A conflict means the list was stale; showing the current one is the fix.
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(entry: FaqEntry) {
    setBusyId(entry.id);
    onStatus(null);

    try {
      await sdk.http.delete(`/api/faq/${entry.id}`);
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      setConfirming(null);
      onStatus({ kind: "ok", text: t("site.faq.deleted") });
    } catch (caught) {
      fail(caught);
    } finally {
      setBusyId(null);
    }
  }

  async function create(draft: { question: string; answer: string; category: FaqCategory; isPublished: boolean }) {
    onStatus(null);

    try {
      // No sortOrder: the API appends to the end of this locale's list.
      await sdk.http.post("/api/faq", { ...draft, locale: faqLocale });
      await load();
      onStatus({ kind: "ok", text: t("site.faq.added") });
      return true;
    } catch (caught) {
      fail(caught);
      return false;
    }
  }

  const dir = faqLocale === "ar" ? "rtl" : "ltr";

  return (
    <>
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <label htmlFor="faq-locale" style={{ fontWeight: 600, color: "var(--text-strong)" }}>
          {t("nav.language")}
        </label>
        <select
          id="faq-locale"
          value={faqLocale}
          onChange={(event) => setFaqLocale(event.target.value as Locale)}
          style={control}
        >
          {LOCALE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>

        <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>{t("site.faq.hint")}</span>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: "var(--space-3)" }} aria-busy="true">
          <div className="skeleton" style={{ blockSize: 96 }} />
          <div className="skeleton" style={{ blockSize: 96 }} />
        </div>
      ) : (
        <section className="card">
          <div className="card-head">
            <h2>{t("site.tab.faq")}</h2>
          </div>

          {entries.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>{t("site.faq.empty")}</p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--space-4)" }}>
              {entries.map((entry, index) => (
                <FaqRow
                  // Keyed by the saved text too, so a row reloaded from the
                  // server drops a draft that no longer applies to it.
                  key={`${entry.id}:${entry.question}:${entry.answer}`}
                  entry={entry}
                  position={index + 1}
                  dir={dir}
                  busy={busyId !== null}
                  saving={busyId === entry.id}
                  isFirst={index === 0}
                  isLast={index === entries.length - 1}
                  onSave={(patch) => void save(entry, patch)}
                  onMove={(by) => void move(index, by)}
                  onDelete={() => setConfirming(entry)}
                />
              ))}
            </ol>
          )}
        </section>
      )}

      {!loading && <NewFaqForm key={faqLocale} dir={dir} onCreate={create} />}

      {/* A real dialog naming the question, rather than window.confirm, which
          cannot show which of twenty similar answers is about to go. */}
      {confirming && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="faq-delete-title">
          <div className="modal">
            <h2 id="faq-delete-title">{t("site.faq.deleteTitle")}</h2>
            <p>{t("site.faq.deleteBody", { values: { question: confirming.question } })}</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirming(null)}
                disabled={busyId === confirming.id}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => void remove(confirming)}
                disabled={busyId === confirming.id}
              >
                {busyId === confirming.id ? t("site.faq.deleting") : t("site.faq.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategorySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: FaqCategory;
  onChange: (value: FaqCategory) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(toFaqCategory(event.target.value))}
      disabled={disabled}
      style={control}
    >
      {FAQ_CATEGORIES.map((key) => (
        <option key={key} value={key}>
          {t(`faq.category.${key}`)}
        </option>
      ))}
    </select>
  );
}

function FaqRow({
  entry,
  position,
  dir,
  busy,
  saving,
  isFirst,
  isLast,
  onSave,
  onMove,
  onDelete,
}: {
  entry: FaqEntry;
  position: number;
  dir: "ltr" | "rtl";
  /** Any write in flight: the order must not change under a pending one. */
  busy: boolean;
  saving: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSave: (patch: Partial<Pick<FaqEntry, "question" | "answer" | "category" | "isPublished">>) => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [question, setQuestion] = useState(entry.question);
  const [answer, setAnswer] = useState(entry.answer);

  const dirty = question !== entry.question || answer !== entry.answer;
  const invalid = tooShort(question, answer);
  const base = `faq-${entry.id}`;

  return (
    <li
      style={{
        display: "grid",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        // A draft is set back, so what visitors see reads first at a glance.
        background: entry.isPublished ? "var(--surface-card)" : "var(--surface-sunken)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <strong style={{ color: "var(--text-strong)" }}>{t("site.faq.position", { values: { n: position } })}</strong>

        <label htmlFor={`${base}-category`} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          {t("site.faq.category")}
        </label>
        <CategorySelect
          id={`${base}-category`}
          value={toFaqCategory(entry.category)}
          onChange={(category) => onSave({ category })}
          disabled={saving}
        />

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={entry.isPublished}
            onChange={(event) => onSave({ isPublished: event.target.checked })}
            disabled={saving}
          />
          {t("site.published")}
        </label>

        <span aria-hidden="true" style={{ marginInlineStart: "auto" }} />

        <button
          type="button"
          className="btn ghost small"
          onClick={() => onMove(-1)}
          disabled={busy || isFirst}
          aria-label={t("site.faq.moveUp")}
          title={t("site.faq.moveUp")}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => onMove(1)}
          disabled={busy || isLast}
          aria-label={t("site.faq.moveDown")}
          title={t("site.faq.moveDown")}
        >
          ↓
        </button>
        <button type="button" className="btn ghost small" onClick={onDelete} disabled={busy}>
          {t("site.faq.delete")}
        </button>
      </div>

      <label htmlFor={`${base}-question`} className="sr-only">
        {t("site.faq.question")}
      </label>
      <input
        id={`${base}-question`}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        dir={dir}
        maxLength={300}
        placeholder={t("site.faq.question")}
        style={{ ...control, fontWeight: 600 }}
      />

      <label htmlFor={`${base}-answer`} className="sr-only">
        {t("site.faq.answer")}
      </label>
      <textarea
        id={`${base}-answer`}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        dir={dir}
        rows={3}
        maxLength={5000}
        placeholder={t("site.faq.answer")}
        style={control}
      />

      {/* As elsewhere on this page, save appears only once there is
          something to save. */}
      {dirty && (
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn primary small"
            onClick={() => onSave({ question: question.trim(), answer: answer.trim() })}
            disabled={saving || invalid}
          >
            {saving ? t("common.saving") : t("common.save")}
          </button>
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              setQuestion(entry.question);
              setAnswer(entry.answer);
            }}
            disabled={saving}
          >
            {t("common.cancel")}
          </button>
          {invalid && (
            <span role="alert" style={{ fontSize: "var(--text-sm)", color: "var(--danger)" }}>
              {t("site.faq.tooShort")}
            </span>
          )}
        </div>
      )}
    </li>
  );
}

function NewFaqForm({
  dir,
  onCreate,
}: {
  dir: "ltr" | "rtl";
  onCreate: (draft: { question: string; answer: string; category: FaqCategory; isPublished: boolean }) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<FaqCategory>(DEFAULT_FAQ_CATEGORY);
  const [isPublished, setIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const invalid = tooShort(question, answer);

  return (
    <form
      className="card"
      style={{ display: "grid", gap: "var(--space-3)" }}
      onSubmit={async (event) => {
        event.preventDefault();
        setTouched(true);
        if (invalid) return;

        setSubmitting(true);
        const created = await onCreate({ question: question.trim(), answer: answer.trim(), category, isPublished });
        setSubmitting(false);

        if (created) {
          setQuestion("");
          setAnswer("");
          setCategory(DEFAULT_FAQ_CATEGORY);
          setIsPublished(true);
          setTouched(false);
        }
      }}
    >
      <div className="card-head">
        <h2>{t("site.faq.addTitle")}</h2>
      </div>

      <label htmlFor="faq-new-question" style={{ fontWeight: 600, color: "var(--text-strong)" }}>
        {t("site.faq.question")}
      </label>
      <input
        id="faq-new-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        dir={dir}
        maxLength={300}
        style={control}
      />

      <label htmlFor="faq-new-answer" style={{ fontWeight: 600, color: "var(--text-strong)" }}>
        {t("site.faq.answer")}
      </label>
      <textarea
        id="faq-new-answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        dir={dir}
        rows={3}
        maxLength={5000}
        style={control}
      />

      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <label htmlFor="faq-new-category" style={{ fontWeight: 600, color: "var(--text-strong)" }}>
          {t("site.faq.category")}
        </label>
        <CategorySelect id="faq-new-category" value={category} onChange={setCategory} />

        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
          {t("site.published")}
        </label>

        <span aria-hidden="true" style={{ marginInlineStart: "auto" }} />

        <button type="submit" className="btn primary small" disabled={submitting}>
          {submitting ? t("site.faq.adding") : t("site.faq.add")}
        </button>
      </div>

      {touched && invalid && (
        <span role="alert" style={{ fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {t("site.faq.tooShort")}
        </span>
      )}
    </form>
  );
}
