/**
 * Cookie names this app knows about.
 *
 * One definition, because two of them had already started to matter in
 * different places: the edge middleware reads the session hint to decide where
 * to send a visitor, and the sign-out path drops it when a logout cannot reach
 * the API. A name that is right in one file and stale in the other fails
 * silently — the middleware simply never finds a cookie.
 *
 * The refresh cookie is deliberately absent. It is httpOnly; no code in this
 * app can see it or remove it, and naming it here would only suggest otherwise.
 */
export const HINT_COOKIE = "mon_sh";

export const LOCALE_COOKIE = "mon_locale";
