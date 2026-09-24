/**
 * The shared HTTP client.
 *
 * The frontend talks to the Express API **directly** through this client.
 * There are deliberately no Next.js route handlers proxying the backend: a
 * proxy layer would duplicate every endpoint, hide the real status codes, and
 * add a network hop for no benefit.
 *
 * Responsibilities kept here rather than in components:
 *   - attaching the access token,
 *   - refreshing it once, transparently, when it expires,
 *   - turning the API's error envelope into a typed exception,
 *   - timing requests out instead of hanging.
 */

export interface TokenPair {
  accessToken: string;
  /**
   * Absent in the browser.
   *
   * The API returns the refresh token in the body *and* as an httpOnly cookie.
   * A browser store keeps only the access token and lets the cookie travel by
   * itself, so there is nothing to put here. A client with no cookie jar — a
   * native app, a test harness — holds the token and passes it explicitly.
   */
  refreshToken?: string | undefined;
}

/**
 * Where tokens live. The web app supplies an implementation — the access token
 * in memory, the refresh token left to the httpOnly cookie, never
 * `localStorage`, which is readable by any injected script.
 */
export interface TokenStore {
  get(): TokenPair | null;
  set(tokens: TokenPair): void;
  clear(): void;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokens?: TokenStore;
  /** Called when refresh fails and the session is genuinely over. */
  onSessionExpired?: () => void;
  timeoutMs?: number;
  /** Forwarded as Accept-Language so the API can localise messages. */
  locale?: () => string;
}

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_BLOCKED"
  | "FORBIDDEN"
  | "INSUFFICIENT_ROLE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "EMAIL_TAKEN"
  | "SLOT_TAKEN"
  | "INVALID_STATE_TRANSITION"
  | "QUOTE_EXPIRED"
  | "QUOTE_ALREADY_USED"
  | "UNPROCESSABLE"
  | "PRICING_FAILED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR";

/**
 * A failed request, carrying the API's machine-readable code.
 *
 * Callers branch on `code`, never on the message text — the legacy frontend
 * did `message.includes("Invalid login")`, which broke the moment the wording
 * changed and could never be translated.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when retrying the same request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.status >= 500 || this.code === "RATE_LIMITED" || this.code === "NETWORK_ERROR";
  }

  /** True when the user must sign in again. */
  get isAuthFailure(): boolean {
    return this.code === "UNAUTHENTICATED" || this.code === "TOKEN_EXPIRED";
  }

  /** Field-level issues from a validation failure, for form rendering. */
  get fieldIssues(): Array<{ path: string; message: string }> {
    const details = this.details as { issues?: Array<{ path: string; message: string }> } | undefined;
    return details?.issues ?? [];
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skips the Authorization header — used by login and register. */
  anonymous?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiClient {
  private refreshInFlight: Promise<string | null> | null = null;

  constructor(private readonly options: ApiClientOptions) {}

  /**
   * The access token currently in use, or an empty string when signed out.
   *
   * Exposed for transports that cannot go through `request` — the WebSocket
   * handshake in particular, which needs the token at connect time.
   */
  getAccessToken(): string {
    return this.options.tokens?.get()?.accessToken ?? "";
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    // One transparent refresh attempt, then give up. Retrying repeatedly on a
    // dead session would loop forever.
    if (response.status === 401 && !options.anonymous) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        return this.parse<T>(await this.send(path, options));
      }

      this.options.tokens?.clear();
      this.options.onSessionExpired?.();
    }

    return this.parse<T>(response);
  }

  get<T>(path: string, query?: RequestOptions["query"]): Promise<T> {
    return this.request<T>(path, { method: "GET", ...(query ? { query } : {}) });
  }

  post<T>(path: string, body?: unknown, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>(path, { method: "POST", body, ...options });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // ── internals ─────────────────────────────────────────────────────────

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const url = new URL(path.replace(/^\//, ""), ensureTrailingSlash(this.options.baseUrl));

    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = { Accept: "application/json" };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (this.options.locale) {
      headers["Accept-Language"] = this.options.locale();
    }

    if (!options.anonymous) {
      const token = this.options.tokens?.get()?.accessToken;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    // Honour a caller-supplied signal alongside our own timeout.
    options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

    try {
      return await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
        // Sent on every request, not only on refresh: the API is a different
        // origin, so without this the browser would withhold the session
        // cookies and refresh could never work.
        credentials: "include",
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";

      throw new ApiError(
        "NETWORK_ERROR",
        0,
        aborted ? "The request timed out." : "Could not reach the server.",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const payload: unknown = text.length > 0 ? safeJsonParse(text) : null;

    if (!response.ok) {
      const envelope = payload as
        | { error?: { code?: string; message?: string; details?: unknown; requestId?: string } }
        | null;

      throw new ApiError(
        (envelope?.error?.code as ApiErrorCode) ?? "INTERNAL_ERROR",
        response.status,
        envelope?.error?.message ?? `Request failed with status ${response.status}.`,
        envelope?.error?.details,
        envelope?.error?.requestId,
      );
    }

    return payload as T;
  }

  /**
   * Refreshes the access token for a transport that cannot retry a 401.
   *
   * `request` recovers from an expired token by itself; a WebSocket handshake
   * cannot — it is refused outright, and reconnecting with the same expired
   * token loops. Sharing the in-flight refresh with `request` matters here:
   * a reconnect racing a REST call must not rotate the refresh token twice,
   * because the server's reuse detection would correctly read that as theft.
   */
  async renewAccessToken(): Promise<string | null> {
    return this.refreshAccessToken();
  }

  /**
   * Refreshes the access token.
   *
   * Concurrent 401s share one in-flight refresh. Without this, several
   * simultaneous requests would each rotate the refresh token, and the
   * server's reuse detection would correctly read that as a stolen token and
   * revoke every session.
   */
  private async refreshAccessToken(): Promise<string | null> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<string | null> {
    const refreshToken = this.options.tokens?.get()?.refreshToken;

    try {
      /**
       * No token in the store is the normal browser case, not a reason to give
       * up: the refresh token is an httpOnly cookie this code cannot read, and
       * `send` includes credentials on every request, so the browser attaches
       * it. Only a client without cookies puts the token in the body.
       *
       * The cost is one request for a visitor who has no session at all — the
       * server answers 401 and the session is cleared. That is unavoidable:
       * whether an httpOnly cookie exists is a question only the server can
       * answer.
       */
      const response = await this.send("/api/auth/refresh", {
        method: "POST",
        body: refreshToken ? { refreshToken } : {},
        anonymous: true,
      });

      if (!response.ok) return null;

      const tokens = (await response.json()) as TokenPair;
      this.options.tokens?.set(tokens);

      return tokens.accessToken;
    } catch {
      return null;
    }
  }
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
