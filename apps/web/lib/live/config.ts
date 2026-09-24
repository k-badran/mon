/**
 * How live data reaches the UI.
 *
 * Two transports are implemented and both are kept working:
 *
 *   - `polling` — React Query refetches on an interval. Currently active.
 *   - `socket`  — the Socket.IO gateway pushes changes. Dormant, but complete.
 *
 * The socket path is deliberately not deleted. Switching back is a one-line
 * config change, so it must keep compiling and keep being correct; the hooks in
 * `useLiveData.ts` call through whichever transport this setting names, and
 * neither path is special-cased inside a component.
 */

export type LiveTransport = "polling" | "socket";

/**
 * Read from the environment so a deployment can switch without a code change.
 * Anything other than "socket" means polling, so a typo fails safe to the
 * transport that works without a WebSocket connection.
 */
export const LIVE_TRANSPORT: LiveTransport =
  process.env.NEXT_PUBLIC_LIVE_TRANSPORT === "socket" ? "socket" : "polling";

/**
 * How often polling refetches tracking data.
 *
 * Five seconds is what the owner asked for. It is a real cost: one request per
 * open tab per interval, so the admin board with ten tabs open is 120 requests
 * a minute. The queries below are scoped and cheap for that reason, and
 * `refetchIntervalInBackground` stays off so a hidden tab stops polling.
 */
export const TRACKING_POLL_MS = 5_000;

/** Reference data changes rarely; polling it at tracking speed is waste. */
export const REFERENCE_POLL_MS = 60_000;

export const isPolling = LIVE_TRANSPORT === "polling";
export const isSocket = LIVE_TRANSPORT === "socket";
