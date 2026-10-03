"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import {
  messageKeys,
  useMyThreads,
  useThread,
  type ChatRole,
  type ThreadSummary,
} from "@/lib/live/useMessages";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { IconMessages } from "@/app/components/dashboard/Icons";

/**
 * The customer's support conversations.
 *
 * These are the same threads the site's chat widget opens while signed in, so
 * a question asked on the homepage can be picked up here, and a reply a team
 * member sends after the widget is closed is not lost. The assistant still
 * answers here until a person takes the conversation over; after that the
 * server keeps it quiet, and this screen says who is on the other end.
 *
 * "Read" is recorded on the server when a conversation is open with a staff
 * reply the customer has not seen, which is what clears the sidebar badge —
 * on this device and any other.
 */

/** Selecting "new" shows an empty conversation; the first send creates it. */
const NEW = "new";

export default function MessagesPage() {
  const { sdk } = useApi();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();

  const list = useMyThreads({ fast: true });
  const threads = useMemo(() => list.data?.threads ?? [], [list.data]);

  const [selected, setSelected] = useState<string | null>(null);

  // Opens the freshest conversation once the list arrives, so the screen is
  // never an empty pane waiting for a click.
  useEffect(() => {
    if (selected === null && threads.length > 0) setSelected(threads[0]!.id);
  }, [selected, threads]);

  const activeId = selected && selected !== NEW ? selected : null;
  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const thread = useThread(activeId);

  // Mark read whenever the open conversation has unread replies — including
  // one that arrives while it is on screen. The cache is cleared at once so
  // the badge does not wait for the next poll to catch up.
  const unreadHere = active?.unread ?? 0;
  useEffect(() => {
    if (!activeId || unreadHere === 0) return;

    void sdk.http
      .post(`/api/chat/${activeId}/read`)
      .then(() => {
        queryClient.setQueryData<{ threads: ThreadSummary[]; unread: number }>(
          messageKeys.mine,
          (previous) =>
            previous && {
              unread: Math.max(0, previous.unread - unreadHere),
              threads: previous.threads.map((row) =>
                row.id === activeId ? { ...row, unread: 0 } : row,
              ),
            },
        );
      })
      // Leaving it unread is the honest outcome; the next visit tries again.
      .catch(() => undefined);
  }, [activeId, unreadHere, sdk, queryClient]);

  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }),
    [locale],
  );

  // ── Composer ────────────────────────────────────────────────────────
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(text);
    setSendFailed(false);

    try {
      const result = await sdk.http.post<{ threadId: string }>("/api/chat", {
        message: text,
        locale,
        ...(activeId ? { threadId: activeId } : {}),
      });

      setDraft("");
      setSelected(result.threadId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: messageKeys.thread(result.threadId) }),
        queryClient.invalidateQueries({ queryKey: messageKeys.mine }),
      ]);
    } catch {
      setSendFailed(true);
    } finally {
      setSending(null);
    }
  }

  // Keeps the newest message in view as the history grows.
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = activeId ? (thread.data?.messages ?? []) : [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, sending]);

  const roleLabel = (role: ChatRole) =>
    role === "user"
      ? t("messages.you")
      : role === "staff"
        ? t("messages.staff")
        : t("messages.assistant");

  return (
    <DashboardShell title={t("dash.messages")}>
      <div className="msg-layout">
        {/* ── Conversations ─────────────────────────────────────────── */}
        <section className="card msg-list" aria-labelledby="msg-list-title">
          <div className="card-head">
            <h2 id="msg-list-title">{t("messages.threads")}</h2>
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setSelected(NEW);
                setSendFailed(false);
              }}
            >
              {t("messages.new")}
            </button>
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
            <p className="msg-empty">{t("messages.empty")}</p>
          )}

          <ul className="msg-threads">
            {threads.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="msg-thread"
                  aria-current={row.id === activeId ? "true" : undefined}
                  onClick={() => {
                    setSelected(row.id);
                    setSendFailed(false);
                  }}
                >
                  <span className="msg-thread-top">
                    <span className="msg-thread-title">
                      {t("messages.conversationFrom", {
                        values: { date: dateTime.format(new Date(row.createdAt)) },
                      })}
                    </span>
                    {row.unread > 0 && (
                      <span className="msg-unread">
                        <span className="sr-only">
                          {t("messages.unread", { count: row.unread, values: { count: row.unread } })}
                        </span>
                        <span aria-hidden="true">{row.unread}</span>
                      </span>
                    )}
                  </span>
                  {row.lastMessage && (
                    <span className="msg-thread-preview">
                      {roleLabel(row.lastMessage.role)}: {row.lastMessage.content}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ── One conversation ──────────────────────────────────────── */}
        <section className="card msg-conversation" aria-labelledby="msg-conv-title">
          <div className="card-head">
            <h2 id="msg-conv-title">
              {active
                ? t("messages.conversationFrom", {
                    values: { date: dateTime.format(new Date(active.createdAt)) },
                  })
                : t("messages.new")}
            </h2>
            {active && (
              <span className={`pill ${active.isHumanHandled ? "is-confirmed" : "is-quoted"}`}>
                {active.isHumanHandled ? t("messages.humanHandled") : t("messages.assistantHandled")}
              </span>
            )}
          </div>

          <div className="msg-history" role="log" aria-live="polite" aria-relevant="additions">
            {activeId && thread.isLoading && (
              <div className="skeleton" style={{ blockSize: 60 }} aria-busy="true" />
            )}

            {activeId && thread.isError && (
              <div className="calc-error">
                {t("messages.loadFailed")}{" "}
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => void thread.refetch()}
                >
                  {t("common.retry")}
                </button>
              </div>
            )}

            {!activeId && !sending && (
              <div className="msg-intro">
                <IconMessages />
                <p>{t("messages.startHint")}</p>
              </div>
            )}

            {/* `dir="auto"` on each text: a message is in whatever language
                its author wrote, which is not necessarily the interface's —
                German inside an Arabic page otherwise loses its punctuation
                to the wrong end of the line. */}
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

            {/* The message in flight, so the send does not look like it did
                nothing while the assistant is answering. */}
            {sending && (
              <div className="msg-bubble is-user is-pending">
                <div className="msg-meta">
                  <span>{t("messages.you")}</span>
                </div>
                <div className="msg-text" dir="auto">{sending}</div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form className="msg-composer" onSubmit={(event) => void send(event)}>
            <label htmlFor="msg-draft" className="sr-only">{t("messages.composerLabel")}</label>
            <textarea
              id="msg-draft"
              rows={2}
              maxLength={2000}
              value={draft}
              placeholder={t("messages.placeholder")}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — as in any chat.
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

          <div aria-live="polite">
            {sendFailed && <p className="calc-error">{t("messages.sendFailed")}</p>}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
