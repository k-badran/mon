import { randomInt } from "node:crypto";

import argon2 from "argon2";
import { eq } from "drizzle-orm";

import { isRole, ROLES, type Role } from "@mon/core";

import { closeDatabase, db } from "./client.js";
import { users } from "./schema/index.js";

/**
 * Creates or promotes a staff account from the command line.
 *
 * The first super administrator cannot be created through the admin screen,
 * because that screen requires a super administrator to be signed in. Somebody
 * has to break the circle from outside the application, and doing it here —
 * against the database, on a machine that already holds the credentials —
 * keeps it out of the HTTP surface entirely. There is deliberately no
 * "bootstrap the first admin" endpoint: such a route is either a permanent
 * hole or a switch someone forgets to turn off.
 *
 * Usage:
 *   tsx src/create-user.ts --email a@b.de --role super_admin --name "Name"
 *   tsx src/create-user.ts --email a@b.de --role admin --password "..." --force
 *
 * Without `--password` a strong one is generated and printed once.
 * Without `--force` an existing account is left untouched, so re-running the
 * script cannot silently reset somebody's password.
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;

  const value = process.argv[index + 1];
  // `--force` style flags have no value; treat a following flag as absent.
  return value && !value.startsWith("--") ? value : undefined;
}

const hasFlag = (name: string) => process.argv.includes(`--${name}`);

/**
 * A readable generated password.
 *
 * Deliberately not a base64 blob: this gets typed by hand, often read off
 * another screen, and a password that is painful to enter gets replaced by a
 * weak one. Five words from a short list plus digits is far past the entropy
 * an online login can be attacked at, and it survives being written down.
 */
const WORDS = [
  "anker", "birke", "delta", "esche", "falke", "garten", "hafen", "insel",
  "jaeger", "kranich", "linde", "morgen", "norden", "olive", "pfeil", "quelle",
  "regen", "silber", "turm", "ufer", "vogel", "wiese", "zeder", "amsel",
  "brise", "cedern", "dorf", "eiche",
];

function generatePassword(): string {
  const words = Array.from({ length: 4 }, () => WORDS[randomInt(WORDS.length)]);
  return `${words.join("-")}-${randomInt(1000, 10_000)}`;
}

/** The same parameters `@mon/auth` uses, so a hash made here verifies there. */
async function hash(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

async function main(): Promise<void> {
  const email = arg("email")?.trim().toLowerCase();
  const roleInput = arg("role") ?? "super_admin";
  const fullName = arg("name") ?? "Super Admin";
  const force = hasFlag("force");

  if (!email) {
    console.error("Missing --email.\n");
    console.error('  tsx src/create-user.ts --email you@example.com --role super_admin --name "Your Name"');
    process.exitCode = 1;
    return;
  }

  if (!isRole(roleInput)) {
    console.error(`Unknown role "${roleInput}". Expected one of: ${ROLES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const role: Role = roleInput;
  const password = arg("password") ?? generatePassword();
  const generated = !arg("password");

  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing && !force) {
    console.log(`\n${email} already exists with role "${existing.role}".`);
    console.log("Nothing changed. Pass --force to set the role and reset the password.\n");
    return;
  }

  const passwordHash = await hash(password);

  if (existing) {
    await db
      .update(users)
      .set({ role, passwordHash, fullName, status: "active", updatedAt: new Date() })
      .where(eq(users.id, existing.id));

    console.log(`\nUpdated ${email}: role "${existing.role}" → "${role}", password reset.`);
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      fullName,
      role,
      // Created by somebody with database access, so the address is trusted
      // already; sending a verification mail to prove it would be theatre.
      emailVerifiedAt: new Date(),
    });

    console.log(`\nCreated ${email} with role "${role}".`);
  }

  if (generated) {
    console.log("\n  Password (shown once — it is stored only as a hash):\n");
    console.log(`    ${password}\n`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
