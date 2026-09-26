import { randomInt } from "node:crypto";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@mon/core";
import argon2 from "argon2";

/**
 * Password hashing with Argon2id.
 *
 * Argon2id won the Password Hashing Competition and is what OWASP recommends
 * today. It is memory-hard, which is what makes GPU cracking expensive —
 * bcrypt is not, and a plain SHA family hash is not remotely adequate.
 */

/**
 * Tuned to OWASP's 2024 baseline: 19 MiB of memory, two iterations.
 * Raise `memoryCost` before `timeCost` if you want more resistance — memory
 * is the dimension attackers find hardest to parallelise.
 */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  assertPasswordShape(plaintext);
  return argon2.hash(plaintext, HASH_OPTIONS);
}

/**
 * Verifies a password. Returns false rather than throwing on a malformed
 * hash, so a corrupted row cannot turn into a 500 that reveals it exists.
 */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

/**
 * True when a stored hash was made with weaker parameters than the current
 * policy. Call after a successful login and re-hash transparently, so the
 * whole user base strengthens over time without a forced reset.
 */
export function needsRehash(hash: string): boolean {
  try {
    return argon2.needsRehash(hash, HASH_OPTIONS);
  } catch {
    // An unparseable hash is by definition not at current policy.
    return true;
  }
}

/**
 * Re-exported, not redeclared.
 *
 * The policy is defined in `@mon/core` because the browser needs it too and
 * cannot import this module — argon2 is a native dependency. Existing callers
 * import these names from here, so they keep working.
 */
export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH };

function assertPasswordShape(plaintext: string): void {
  if (plaintext.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }

  // Argon2 itself is fine with long input, but an unbounded password is a
  // cheap way to make the server burn memory on every login attempt.
  if (plaintext.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
}

/**
 * A temporary password for an account somebody else creates.
 *
 * Four words and four digits rather than a base64 blob. This value gets read
 * off one screen and typed into another — often dictated over the phone — and
 * a password that is painful to enter is one that gets replaced by a weak one
 * before the day is out. Four words from this list plus four digits is about
 * 2^23 combinations, which is far past what an online login can be attacked
 * at, and it survives being written on paper.
 *
 * `randomInt` is the CSPRNG, not `Math.random`: this is a credential, and
 * `Math.random` is seeded predictably enough to enumerate.
 */
const TEMPORARY_PASSWORD_WORDS = [
  "anker", "birke", "delta", "esche", "falke", "garten", "hafen", "insel",
  "jaeger", "kranich", "linde", "morgen", "norden", "olive", "pfeil", "quelle",
  "regen", "silber", "turm", "ufer", "vogel", "wiese", "zeder", "amsel",
  "brise", "cedern", "dorf", "eiche",
] as const;

export function generateTemporaryPassword(): string {
  const words = Array.from(
    { length: 4 },
    () => TEMPORARY_PASSWORD_WORDS[randomInt(TEMPORARY_PASSWORD_WORDS.length)]!,
  );

  return `${words.join("-")}-${randomInt(1000, 10_000)}`;
}
