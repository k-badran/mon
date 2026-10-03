"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import type { ChatRole } from "@/lib/live/useMessages";
import {
  staffInboxKeys,
  useStaffThread,
  useStaffThreads,
  type StaffThreadFilter,
  type StaffThreadSummary,
} from "@/lib/live/useStaffInbox";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { IconMessages } from "@/app/components/dashboard/Icons";

/**
 * The support inbox: the other end of the customer's Messages screen and of
 * the site's chat widget.
 *
 * The server sorts conversations waiting on a person to the top — taken over
 * with the customer's message unanswered, or where the assistant could not
 * help — so the first row is always the one to open next.
 *
 * Reading needs `messages.read`, which opens the route. Taking over and
 * replying need `messages.write`; without it the controls are not rendered,
 * and the API refuses the calls regardless.
 */

const FILTERS: ReadonlyArray<{ value: StaffThreadFilter; labelKey: string }> = [
  { value: "all", labelKey: "inbox.filterAll" },
  { value: "waiting", labelKey: "inbox.filterWaiting" },
  { value: "assistant", labelKey: "inbox.filterAssistant" },
  { value: "human", labelKey: "inbox.filterHuman" },
];

export default function StaffInboxPage() {
  const { sdk, can } = useApi();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const mayWrite = can("messages.write");

  const [filter, setFilter] = useState<StaffThreadFilter>("all");
  const list = useStaffThreads(filter);
  const threads = useMemo(() => list.data?.threads ?? [], [list.data]);

  const [selected, setSelected] = useState<string | null>(null);

  // Opens the top of the list — the conversation most in need of an answer —
  // so the screen is not an empty pane waiting for a click.
  useEffect(() => {
    if (selected === null && threads.length > 0) setSelected(threads[0]!.id);
  }, [selected, threads]);

  const thread = useStaffThread(selected);
  const detail = thread.data;

  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  /** Everything under the inbox, including the nav badge's count. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: staffInboxKeys.all });

  // ── Take over ───────────────────────────────────────────────────────
  const [takingOver, setTakingOver] = useState(false);
  const [takeOverFailed, setTakeOverFailed] = useState(false);

  async function takeOver() {
    if (!selected || takingOver) return;

    setTakingOver(true);
    setTakeOverFailed(false);

    try {
      await sdk.http.post(`/api/chat/${selected}/takeover`);
      await refresh();
    } catch {
      setTakeOverFailed(true);
    } finally {
      setTakingOver(false);
    }
  }

  // ── Reply ───────────────────────────────────────────────────────────
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);

  // A draft belongs to the conversation it was typed in; switching threads
  // must not carry it across to someone else.
  useEffect(() => {
    setDraft("");
    setSendFailed(false);
    setTakeOverFailed(false);
  }, [selected]);

  async function reply(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!selected || !text || sending) return;

    setSending(text);
    setSendFailed(false);

    try {
      await sdk.http.post(`/api/chat/${selected}/reply`, { body: text });
      setDraft("");
      await refresh();
    } catch {
      setSendFailed(true);
    } finally {
      setSending(null);
    }
  }

  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = detail?.messages ?? [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, sending]);

  const roleLabel = (role: ChatRole) =>
    role === "user"
      ? t("admin.customer")
      : role === "staff"
        ? t("messages.staff")
        : t("messages.assistant");

  const customerLabel = (row: Pick<StaffThreadSummary, "customer">) =>
    row.customer ? row.customer.name || row.customer.email : t("inbox.visitor");

  const statusLabel = (row: Pick<StaffThreadSummary, "isHumanHandled" | "handledByName" | "waiting">) =>
    row.waiting
      ? t("inbox.waiting")
      : row.isHumanHandled
        ? row.handledByName
          ? t("inbox.statusHuman", { values: { name: row.handledByName } })
          : t("inbox.statusHumanUnknown")
        : t("inbox.statusAssistant");

  return (
    <DashboardShell title={t("admin.nav.messages")} variant="staff">
      <div className="msg-layout is-staff">
        {/* ── Conversations ─────────────────────────────────────────── */}
        <section className="card msg-list" aria-labelledby="inbox-list-title">
          <div className="card-head">
            <h2 id="inbox-list-title">{t("messages.threads")}</h2>
          </div>

          <div className="filter-pills" role="group" aria-label={t("inbox.filterLabel")}>
            {FILTERS.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setSelected(null);
                }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {list.isLoading && (
            <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
              {[0, 1, 2].map((index) => (
                <div key={index} className="skeleton-row" />
              ))}
            </div>
          )}

          {list.isError && (
            <div className="calc-error">
              {t("messages.loadFailed")}{" "}
              <button type="button" className="btn ghost small" onClick={() => void list.refetch()}>
                {t("common.retry")}
              </button>
            </div>
          )}

          {!list.isLoading && !list.isError && threads.length === 0 && (
            <p className="msg-empty">{t("inbox.empty")}</p>
          )}

          <ul className="msg-threads">
            {threads.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`msg-thread${row.waiting ? " is-waiting" : ""}`}
                  aria-current={row.id === selected ? "true" : undefined}
                  onClick={() => setSelected(row.id)}
                >
                  <span className="msg-thread-top">
                    <span className="msg-thread-title" dir="auto">{customerLabel(row)}</span>
                    {/* The last message's time, not the thread's: `updatedAt` also moves
                        on a takeover, which is not something the customer said. */}
                    <time className="msg-thread-when" dateTime={row.lastMessage?.createdAt ?? row.updatedAt}>
                      {dateTime.format(new Date(row.lastMessage?.createdAt ?? row.updatedAt))}
                    </time>
                  </span>
                  <span className="msg-thread-status">{statusLabel(row)}</span>
                  {row.lastMessage && (
                    <span className="msg-thread-preview" dir="auto">
                      {roleLabel(row.lastMessage.role)}: {row.lastMessage.content}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ── One conversation ──────────────────────────────────────── */}
        <section className="card msg-conversation" aria-labelledby="inbox-conv-title">
          <div className="card-head">
            <div className="msg-customer">
              <h2 id="inbox-conv-title" dir="auto">
                {detail ? customerLabel(detail) : t("admin.nav.messages")}
              </h2>
              {detail?.customer?.email && detail.customer.name && (
                <span className="mail">{detail.customer.email}</span>
              )}
            </div>

            {detail && (
              <div className="msg-head-actions">
                <span className={`pill ${detail.isHumanHandled ? "is-confirmed" : "is-quoted"}`}>
                  {statusLabel({ ...detail, waiting: false })}
                </span>
                {mayWrite && !detail.isHumanHandled && (
                  <button
                    type="button"
                    className="btn ghost small"
                    title={t("inbox.takeOverHint")}
                    disabled={takingOver}
                    onClick={() => void takeOver()}
                  >
                    {t("inbox.takeOver")}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="msg-history" role="log" aria-live="polite" aria-relevant="additions">
            {selected && thread.isLoading && (
              <div className="skeleton" style={{ blockSize: 60 }} aria-busy="true" />
            )}

            {selected && thread.isError && (
              <div className="calc-error">
                {t("messages.loadFailed")}{" "}
                <button type="button" className="btn ghost small" onClick={() => void thread.refetch()}>
                  {t("common.retry")}
                </button>
              </div>
            )}

            {!selected && (
              <div className="msg-intro">
                <IconMessages />
                <p>{t("inbox.selectHint")}</p>
              </div>
            )}

            {/* `dir="auto"` per text, as on the customer's side: a message is
                in its author's language, not necessarily the interface's. */}
            {messages.map((message) => (
              <div key={message.id} className={`msg-bubble is-${message.role}`}>
                <div className="msg-meta">
                  <span>{roleLabel(message.role)}</span>
                  <time dateTime={message.createdAt}>
                    {dateTime.format(new Date(message.createdAt))}
                  </time>
                </div>
                <div className="msg-text" dir="auto">{message.content}</div>
              </div>
            ))}

            {sending && (
              <div className="msg-bubble is-staff is-pending">
                <div className="msg-meta">
                  <span>{t("messages.staff")}</span>
                </div>
                <div className="msg-text" dir="auto">{sending}</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {detail && mayWrite && (
            <>
              <form className="msg-composer" onSubmit={(event) => void reply(event)}>
                <label htmlFor="inbox-draft" className="sr-only">{t("messages.composerLabel")}</label>
                <textarea
                  id="inbox-draft"
                  rows={2}
                  maxLength={5000}
                  value={draft}
                  placeholder={t("messages.placeholder")}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <button type="submit" className="btn primary" disabled={!draft.trim() || Boolean(sending)}>
                  {t("messages.send")}
                </button>
              </form>
              {/* Replying takes the conversation over on the server, so the
                  hint is only worth showing while the assistant still has it. */}
              {!detail.isHumanHandled && <p className="msg-hint">{t("inbox.replyHint")}</p>}
            </>
          )}

          {detail && !mayWrite && <p className="msg-hint">{t("inbox.readOnly")}</p>}

          <div aria-live="polite">
            {sendFailed && <p className="calc-error">{t("messages.sendFailed")}</p>}
            {takeOverFailed && <p className="calc-error">{t("inbox.takeOverFailed")}</p>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
