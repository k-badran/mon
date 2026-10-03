"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServiceType } from "@mon/client";
import { useMemo, useState, type FormEvent } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";

/**
 * Reviews.
 *
 * For everyone: the moves they can still rate, and what they have written —
 * with whether it is on the site yet, because a review is held back until a
 * moderator publishes it and one that silently never appears reads as lost.
 *
 * For staff holding `reviews.read`: the moderation list, in a second tab.
 * It lives here because this is where the navigation already points for
 * reviews; the staff-side Quality section is still planned. Reading the list
 * and acting on it are separate capabilities, as they are on the API — a
 * customer-service agent sees the queue, only `reviews.moderate` gets the
 * buttons, and the PATCH checks that again for itself.
 *
 * Publishing is what puts a review into the public `GET /api/reviews`; hiding
 * takes it out again on the next request, as nothing caches that listing.
 */

interface MyReview {
  id: string;
  orderId: string;
  orderReference: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  adminReply: string | null;
  createdAt: string;
}

/** A completed job of the caller's that has no review yet. */
interface Reviewable {
  id: string;
  reference: string;
  serviceType: ServiceType;
  scheduledDate: string | null;
}

interface ModerationRow extends MyReview {
  reviewerName: string;
}

type ModerationStatus = "unpublished" | "published" | "all";

const reviewKeys = {
  mine: ["reviews", "mine"] as const,
  moderation: (status: ModerationStatus) => ["reviews", "moderation", status] as const,
};

export default function ReviewsPage() {
  const { t } = useI18n();
  const { can } = useApi();
  const staff = can("reviews.read");

  const [tab, setTab] = useState<"mine" | "moderation">("mine");

  return (
    <DashboardShell title={t("nav.reviews")}>
      {staff && (
        <div className="tabs" role="tablist" aria-label={t("nav.reviews")}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "mine"}
            onClick={() => setTab("mine")}
          >
            {t("reviews.tabMine")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "moderation"}
            onClick={() => setTab("moderation")}
          >
            {t("reviews.tabModeration")}
          </button>
        </div>
      )}

      {staff && tab === "moderation" ? <Moderation /> : <MyReviews />}
    </DashboardShell>
  );
}

// ── The customer's side ─────────────────────────────────────────────────

function MyReviews() {
  const { sdk, user } = useApi();
  const { t, formatDate } = useI18n();

  const mine = useQuery({
    queryKey: reviewKeys.mine,
    queryFn: () =>
      sdk.http.get<{ items: MyReview[]; reviewable: Reviewable[] }>("/api/reviews/mine"),
    enabled: Boolean(user),
  });

  // Only the caller's own completed, unreviewed jobs — worked out by the
  // server, which is also what refuses anything else.
  const open = mine.data?.reviewable ?? [];
  const loading = mine.isLoading;

  return (
    <>
      <section className="card" aria-labelledby="rate-title">
        <div className="card-head">
          <h2 id="rate-title">{t("reviews.rateTitle")}</h2>
        </div>

        {loading && <div className="skeleton" style={{ blockSize: 60 }} aria-busy="true" />}

        {!loading && open.length === 0 && <p className="review-empty">{t("reviews.nothingToRate")}</p>}

        <div className="review-forms">
          {open.map((order) => (
            <ReviewForm
              key={order.id}
              orderId={order.id}
              heading={`${order.reference} · ${t(`service.${order.serviceType}`)}${
                order.scheduledDate ? ` · ${formatDate(order.scheduledDate)}` : ""
              }`}
            />
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="mine-title">
        <div className="card-head">
          <h2 id="mine-title">{t("reviews.mineTitle")}</h2>
        </div>

        {mine.isError && (
          <div className="calc-error">
            {t("reviews.loadFailed")}{" "}
            <button type="button" className="btn ghost small" onClick={() => void mine.refetch()}>
              {t("common.retry")}
            </button>
          </div>
        )}

        {!mine.isLoading && !mine.isError && (mine.data?.items.length ?? 0) === 0 && (
          <p className="review-empty">{t("reviews.noneYet")}</p>
        )}

        <ul className="review-list">
          {(mine.data?.items ?? []).map((review) => (
            <li key={review.id} className="review-item">
              <div className="review-item-head">
                <Stars value={review.rating} />
                <span className="review-ref">{review.orderReference}</span>
                <span className={`pill ${review.isPublished ? "is-completed" : "is-quoted"}`}>
                  {review.isPublished ? t("reviews.published") : t("reviews.awaiting")}
                </span>
              </div>
              {review.comment && <p className="review-comment" dir="auto">{review.comment}</p>}
              {review.adminReply && (
                <div className="review-reply">
                  <strong>{t("reviews.adminReply")}</strong>
                  <p dir="auto">{review.adminReply}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function ReviewForm({ orderId, heading }: { orderId: string; heading: string }) {
  const { sdk } = useApi();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (rating === 0 || saving) return;

    setSaving(true);
    setFailed(false);

    try {
      await sdk.http.post("/api/reviews", {
        orderId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      // The order moves from "to rate" to "yours" once the list refetches.
      await queryClient.invalidateQueries({ queryKey: reviewKeys.mine });
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const id = `review-${orderId}`;

  return (
    <form className="review-form" onSubmit={(event) => void submit(event)}>
      <h3>{heading}</h3>

      <fieldset className="star-input">
        <legend>{t("reviews.ratingLabel")}</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value} className={value <= rating ? "is-on" : ""}>
            <input
              type="radio"
              name={`${id}-rating`}
              value={value}
              checked={rating === value}
              onChange={() => setRating(value)}
              className="sr-only"
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">
              {t("reviews.stars", { values: { rating: value } })}
            </span>
          </label>
        ))}
      </fieldset>

      <label htmlFor={`${id}-comment`} className="review-label">
        {t("reviews.commentLabel")} <span className="review-optional">({t("common.optional")})</span>
      </label>
      <textarea
        id={`${id}-comment`}
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t("reviews.commentPlaceholder")}
      />

      <div aria-live="polite">{failed && <p className="calc-error">{t("reviews.submitFailed")}</p>}</div>

      <div className="review-form-actions">
        <p className="field-hint">{t("reviews.moderationHint")}</p>
        <button type="submit" className="btn primary" disabled={rating === 0 || saving}>
          {saving ? t("common.saving") : t("reviews.submit")}
        </button>
      </div>
    </form>
  );
}

// ── Moderation ──────────────────────────────────────────────────────────

function Moderation() {
  const { sdk, can } = useApi();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const moderate = can("reviews.moderate");

  const [status, setStatus] = useState<ModerationStatus>("unpublished");
  const [replying, setReplying] = useState<ModerationRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const list = useQuery({
    queryKey: reviewKeys.moderation(status),
    queryFn: () =>
      sdk.http.get<{ items: ModerationRow[] }>("/api/reviews/moderation", { status }),
  });

  const date = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

  async function update(id: string, patch: { isPublished?: boolean; adminReply?: string }) {
    setBusy(id);
    setFailed(false);

    try {
      await sdk.http.patch(`/api/reviews/${id}`, patch);
      // Every status list may hold the row, so all of them are refetched.
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(null);
    }
  }

  const rows = list.data?.items ?? [];

  return (
    <>
      <div className="table-toolbar">
        <div className="filter-pills" role="group" aria-label={t("common.status")}>
          {(["unpublished", "published", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {t(`reviews.filter.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {(list.isError || failed) && (
          <div className="calc-error">
            {failed ? t("reviews.updateFailed") : t("reviews.loadFailed")}{" "}
            {list.isError && (
              <button type="button" className="btn ghost small" onClick={() => void list.refetch()}>
                {t("common.retry")}
              </button>
            )}
          </div>
        )}
      </div>

      {list.isLoading && (
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      )}

      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="card empty-state">
          <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("reviews.moderationEmpty")}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>{t("orders.reference")}</th>
                <th>{t("reviews.reviewer")}</th>
                <th>{t("reviews.rating")}</th>
                <th>{t("reviews.comment")}</th>
                <th>{t("reviews.submitted")}</th>
                <th>{t("common.status")}</th>
                {moderate && <th>{t("common.action")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="ref" data-label={t("orders.reference")}>{row.orderReference}</td>
                  <td data-label={t("reviews.reviewer")}>{row.reviewerName}</td>
                  <td data-label={t("reviews.rating")}>
                    <Stars value={row.rating} />
                  </td>
                  <td data-label={t("reviews.comment")} className="review-cell">
                    <span dir="auto">{row.comment ?? t("common.none")}</span>
                    {row.adminReply && (
                      <div className="review-reply">
                        <strong>{t("reviews.adminReply")}</strong>
                        <p dir="auto">{row.adminReply}</p>
                      </div>
                    )}
                  </td>
                  <td data-label={t("reviews.submitted")}>{date.format(new Date(row.createdAt))}</td>
                  <td data-label={t("common.status")}>
                    <span className={`pill ${row.isPublished ? "is-completed" : "is-quoted"}`}>
                      {row.isPublished ? t("reviews.published") : t("reviews.unpublished")}
                    </span>
                  </td>
                  {moderate && (
                    <td className="row-action">
                      <div className="review-actions">
                        <button
                          type="button"
                          className={`btn small ${row.isPublished ? "ghost" : "primary"}`}
                          disabled={busy === row.id}
                          onClick={() => void update(row.id, { isPublished: !row.isPublished })}
                        >
                          {row.isPublished ? t("reviews.hide") : t("reviews.publish")}
                        </button>
                        <button
                          type="button"
                          className="btn ghost small"
                          disabled={busy === row.id}
                          onClick={() => setReplying(row)}
                        >
                          {t("reviews.reply")}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {replying && (
        <ReplyDialog
          review={replying}
          saving={busy === replying.id}
          onCancel={() => setReplying(null)}
          onSave={async (text) => {
            if (await update(replying.id, { adminReply: text })) setReplying(null);
          }}
        />
      )}
    </>
  );
}

function ReplyDialog({
  review,
  saving,
  onCancel,
  onSave,
}: {
  review: ModerationRow;
  saving: boolean;
  onCancel: () => void;
  onSave: (text: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(review.adminReply ?? "");

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reply-title">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(text.trim());
        }}
      >
        <h2 id="reply-title">
          {t("reviews.replyTitle", { values: { reference: review.orderReference } })}
        </h2>
        {review.comment && <p className="review-comment" dir="auto">{review.comment}</p>}

        <label htmlFor="reply-text" className="review-label">{t("reviews.replyLabel")}</label>
        <textarea
          id="reply-text"
          rows={4}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="field-hint">{t("reviews.replyHint")}</p>

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const { t } = useI18n();

  return (
    <span
      className="stars"
      role="img"
      aria-label={t("reviews.stars", { values: { rating: value } })}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <span key={index} className={index <= value ? "is-on" : ""} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
