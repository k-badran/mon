/**
 * The password length policy, in the one place both tiers can read it.
 *
 * It lives in `core` rather than in `auth` because the browser needs it too —
 * the signup and reset forms set `minLength` and render "at least N
 * characters" — and `auth` cannot be imported into a bundle: it pulls in
 * argon2, a native module.
 *
 * Before this, `apps/web/app/[locale]/signup/page.tsx` declared its own
 * `const PASSWORD_MIN_LENGTH = 10`. Two copies of a validation rule drift, and
 * the failure is quiet in the direction that matters: raise the server's
 * minimum and the form keeps accepting what the API now rejects, so the user
 * gets a generic validation error on a password the page told them was fine.
 *
 * Deliberately length only — no "must contain a symbol" rule. NIST SP 800-63B
 * advises against composition rules, which push people toward predictable
 * patterns like "Password1!".
 */

export const PASSWORD_MIN_LENGTH = 10;

/**
 * Argon2 itself is fine with long input, but an unbounded password is a cheap
 * way to make the server burn memory on every login attempt.
 */
export const PASSWORD_MAX_LENGTH = 256;
