import type { MailMessage, MailTransport, SentMail } from "../types.js";

export interface ResendOptions {
  apiKey: string;
  /** Default `From`, used when a message does not override it. */
  from: string;
  replyTo?: string | undefined;
  /** How many times a *transient* failure is retried. Default 2. */
  maxRetries?: number | undefined;
  onAttempt?: ((event: ResendAttemptEvent) => void) | undefined;
}

export interface ResendAttemptEvent {
  attempt: number;
  outcome: "sent" | "retrying" | "failed";
  status?: number | undefined;
  message?: string | undefined;
}

const ENDPOINT = "https://api.resend.com/emails";

/**
 * Delivery over Resend's HTTP API.
 *
 * This exists for one reason: it sends over port 443. The SMTP submission ports
 * — 25, 465 and 587 — are blocked both on the development machine and on the
 * DigitalOcean host this deploys to, which is that provider's default for new
 * accounts. An HTTP API is not subject to that, so the same mailbox can keep
 * sending without waiting on a support ticket to lift the block.
 *
 * `fetch` rather than the `resend` SDK: the request is one POST with a JSON
 * body, and the SDK would add a dependency, its own version policy and its own
 * error vocabulary to translate back into this one.
 */
export function createResendTransport(options: ResendOptions): MailTransport {
  const maxRetries = options.maxRetries ?? 2;

  async function attemptSend(message: MailMessage, attempt: number): Promise<SentMail> {
    let response: Response;

    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from ?? options.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(message.replyTo ?? options.replyTo
            ? { reply_to: message.replyTo ?? options.replyTo }
            : {}),
        }),
        // Without this a hung connection holds the request handling it open
        // indefinitely, and a stalled password-reset endpoint is worse than a
        // failed one — the customer just keeps retrying it.
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      // A network-level failure: DNS, TLS, or the timeout above. Always worth
      // one more attempt, because none of them say anything about the request.
      return retryOrThrow(message, attempt, cause, undefined);
    }

    if (response.ok) {
      const body = (await response.json()) as { id?: string };
      options.onAttempt?.({ attempt, outcome: "sent" });

      return { messageId: body.id ?? "unknown", via: "resend", delivered: true };
    }

    const detail = await readError(response);

    /**
     * Retry 429 and 5xx only.
     *
     * A 429 is the documented rate limit — Resend allows 10 requests a second,
     * and a burst of codes can cross it. A 5xx is theirs to fix and usually
     * brief. Everything else is 4xx: a rejected recipient, an unverified
     * domain, a revoked key. Retrying those does not fix them, it just spends
     * three attempts arriving at the same answer.
     */
    const retryable = response.status === 429 || response.status >= 500;

    if (!retryable || attempt > maxRetries) {
      options.onAttempt?.({
        attempt,
        outcome: "failed",
        status: response.status,
        message: detail,
      });

      throw new Error(`Resend rejected the message (${response.status}): ${detail}`);
    }

    return retryOrThrow(message, attempt, new Error(detail), response.status);
  }

  async function retryOrThrow(
    message: MailMessage,
    attempt: number,
    cause: unknown,
    status: number | undefined,
  ): Promise<SentMail> {
    const detail = cause instanceof Error ? cause.message : String(cause);

    if (attempt > maxRetries) {
      options.onAttempt?.({ attempt, outcome: "failed", status, message: detail });
      throw cause instanceof Error ? cause : new Error(detail);
    }

    options.onAttempt?.({ attempt, outcome: "retrying", status, message: detail });

    // Linear, and short: a request is waiting on this.
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));

    return attemptSend(message, attempt + 1);
  }

  return {
    driver: "resend",
    send: (message) => attemptSend(message, 1),

    /**
     * Confirms the key is accepted, without sending anything.
     *
     * `GET /domains` is the cheapest authenticated call available. A key scoped
     * to sending only may be refused here with a 401 while being perfectly able
     * to send, so that case is reported as a pass — the check exists to catch a
     * missing or revoked key, not to audit its permissions.
     */
    verify: async () => {
      const response = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${options.apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok || response.status === 401) return;

      throw new Error(`Resend API is not reachable (${response.status}).`);
    },

    // Nothing pooled — each send is one HTTP request.
    close: async () => {},
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
