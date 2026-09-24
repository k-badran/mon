import type { TokenPair, TokenStore } from "./http.js";

/**
 * Token storage implementations.
 *
 * The access token is held in memory only. `localStorage` is readable by any
 * injected script, so a single XSS gives away a working session — and unlike a
 * cookie it is sent nowhere automatically, so it buys nothing in exchange.
 *
 * The refresh token is the one value that must survive a page reload, and it
 * now does so as an httpOnly cookie the API sets and the browser attaches by
 * itself. That is what the note here used to ask for; the `localStorage`
 * fallback it described has been removed rather than kept as a second path,
 * because a fallback that stores the token in script-readable storage gives
 * back exactly what the cookie was for.
 */

export function createMemoryTokenStore(): TokenStore {
  let tokens: TokenPair | null = null;

  return {
    get: () => tokens,
    set: (next) => {
      tokens = next;
    },
    clear: () => {
      tokens = null;
    },
  };
}

/**
 * The key the previous version wrote the refresh token under.
 *
 * Removed on startup: a browser that ran the old build still has a live
 * 30-day refresh token sitting in `localStorage`, and moving to cookies does
 * not take that copy away by itself.
 */
const LEGACY_REFRESH_KEY = "umzugplus.refresh";

/**
 * Access token in memory, refresh token in an httpOnly cookie.
 *
 * Nothing is read from or written to storage. `get()` reports no refresh
 * token, which is the truth — this code cannot see it — and the transport
 * refreshes against the cookie instead. A client that genuinely has no cookie
 * jar uses `createMemoryTokenStore` and passes the token in the body.
 */
export function createBrowserTokenStore(): TokenStore {
  let accessToken: string | null = null;

  try {
    globalThis.localStorage?.removeItem(LEGACY_REFRESH_KEY);
  } catch {
    // Private mode, or a browser configured to block site data. Nothing to
    // clean up in that case.
  }

  return {
    get: () => (accessToken ? { accessToken } : null),
    set: (tokens) => {
      // `tokens.refreshToken` is ignored deliberately. The same response that
      // carried it also set the cookie, and that copy is the one that survives
      // a reload — writing it anywhere here would only widen its exposure.
      accessToken = tokens.accessToken;
    },
    clear: () => {
      accessToken = null;
    },
  };
}
