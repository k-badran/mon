# UmzugPlus — Monorepo

A pnpm + Turborepo monorepo containing the UmzugPlus backend API and web
frontend: online quotes, booking and dispatch for moving, disposal and cleaning
services in North Rhine-Westphalia.

## Tech Stack

- **Runtime:** Node.js 20+, TypeScript 5.9 (strict)
- **Framework:** Express 4
- **Database:** PostgreSQL 16 + Drizzle ORM
- **Cache / rate limiting / pub-sub:** Redis 7
- **Validation:** Zod at every request boundary
- **Auth:** JWT issued and verified by this API — access tokens (HS256, 15 min)
  plus opaque, rotating refresh tokens stored hashed
- **Package manager:** pnpm 10.4
- **Orchestration:** Turborepo 2

---

## Folder Structure

```
.
├── apps/
│   ├── api/                # Express backend — all business logic + realtime gateway
│   └── web/                # Next.js frontend — calls the API through the SDK
│
├── packages/
│   ├── auth/               # Argon2id password hashing, JWT sign/verify
│   ├── config/             # Zod-validated environment loading
│   ├── client/             # Typed SDK the frontend calls the API with
│   ├── core/               # Pure domain logic: pricing, dates, holidays, availability
│   ├── db/                 # Drizzle schema, client, migrations, seed
│   └── typescript-config/  # Shared tsconfig bases
│
├── docker-compose.dev.yml  # Local PostgreSQL + Redis
├── turbo.json
└── .env.example
```

---

## Architecture

The backend owns every write. The browser never calculates a price, asserts a
role, or writes to the database — a deliberate reversal of the previous design,
where all 51 database writes ran client-side against a public key.

```
Browser ──HTTPS──► Express API ──► PostgreSQL
                        │
                        ├──► Redis      (rate limits, cache, pub/sub)
                        └──► SMTP / Anthropic / Geocoding
```

### Packages

#### `packages/core` — `@umzugplus/core`

Pure, dependency-free domain logic. Every function is deterministic and unit
tested, which is what makes a disputed invoice reproducible.

| Module | Responsibility |
| --- | --- |
| `money` | Exact arithmetic in integer cents. Never floats. |
| `calendar-date` | A calendar day is a `"YYYY-MM-DD"` label, never routed through UTC. |
| `holidays` | German/NRW public holidays computed from Easter for any year. |
| `availability` | Day classification: past, too soon, closed, holiday, blocked, full, free. |
| `pricing` | The single pricing engine. One implementation, server-side only. |

#### `packages/client` — `@umzugplus/client`

The typed SDK. The frontend calls the Express API **directly** through this —
there are deliberately no Next.js route handlers proxying the backend, which
would duplicate every endpoint, hide real status codes, and add a network hop
for no benefit.

```ts
const sdk = createSdk({ baseUrl: process.env.NEXT_PUBLIC_API_URL!, tokens });

const quote = await sdk.quotes.create({ serviceType: "moving", /* … */ });
const order = await sdk.orders.create({ quoteId: quote.id, /* … */ });
```

It attaches the access token, refreshes once transparently on a 401
(de-duplicating concurrent refreshes, so the server's reuse detection is not
tripped), times requests out, and throws a typed `ApiError` carrying the API's
machine-readable `code` — callers branch on `code`, never on message text.

Request and response types come from `@umzugplus/core`, so a change to
`QuoteInput` breaks the frontend build rather than failing at runtime.

#### `packages/auth` — `@umzugplus/auth`

- `hashPassword` / `verifyPassword` — Argon2id at the OWASP 2024 baseline,
  with transparent re-hashing when parameters are strengthened.
- `signAccessToken` / `verifyAccessToken` — HS256, issuer and audience checked,
  payload shape validated after the signature.
- `generateRefreshToken` — 256 bits of CSPRNG entropy, stored as a SHA-256 hash.

#### `packages/db` — `@umzugplus/db`

Drizzle schema across 23 tables. Money is `numeric(10,2)`; booking days are
`date`; order status, roles and service types are Postgres enums so an invalid
value is a write error rather than a silent typo.

---

## API

Base URL `http://localhost:4000`. All errors share one shape:

```json
{ "error": { "code": "INVALID_CREDENTIALS", "message": "…", "requestId": "…" } }
```

### Auth — `/api/auth`

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /register` | — | Create an account. `role` is always `customer`; a client cannot set it. |
| `POST /login` | — | Exchange credentials for a token pair. |
| `POST /refresh` | — | Rotate the refresh token. Replaying a rotated token revokes every session for that user. |
| `POST /logout` | — | Revoke one device's session. |
| `GET  /me` | Bearer | The verified identity from the token. |
| `GET  /sessions` | Bearer | List live sessions, so a user can see their devices. |
| `POST /change-password` | Bearer | Change password and revoke all other sessions. |
| `POST /request-password-reset` | — | Email a reset link. Always answers `202`, even for an unknown address — a different answer would make this an account-enumeration oracle. |
| `POST /confirm-password-reset` | — | Set a new password from the link's token and revoke every session. Does not sign the caller in: they proved control of the mailbox, not of the account. |
| `POST /send-verification` | Bearer | Send (or re-send) the address-confirmation link. `409` if already confirmed. |
| `POST /verify-email` | — | Confirm an address from the link. Unauthenticated on purpose — the link is opened from a mail client, often on a device that has never signed in. |
| `POST /otp/request` | — | Email a six-digit login code, valid 10 minutes. Same `202` for every address, for the same reason as the reset. |
| `POST /otp/verify` | — | Exchange a correct code for a full session. Five wrong guesses kill the code, counted on the row rather than per IP. |

### Quotes — `/api/quotes`

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /` | optional | Price a job. The client sends the job description and receives a breakdown — never a price, and never the rate card. |
| `GET /:id` | optional | Fetch a quote. Anonymous quotes are readable by whoever holds the id. |

### Orders — `/api/orders`

| Endpoint | Auth | Description |
| --- | --- | --- |
| `POST /` | Bearer | Book a quote. Price is re-read from the stored quote; capacity is re-checked under a row lock. |
| `GET /` | Bearer | Paginated list. Customers see only their own; staff see all. |
| `GET /:id` | Bearer | One order. Returns 404 rather than 403 for someone else's. |
| `PATCH /:id/status` | staff | Change status through the state machine. |
| `POST /:id/cancel` | Bearer | Cancel. The fee is computed server-side from the published terms. |

### Availability — `/api/availability`

| Endpoint | Auth | Description |
| --- | --- | --- |
| `GET /` | — | Month calendar. Advisory only. |
| `POST /blocked` | admin | Block a day. |
| `DELETE /blocked/:day` | admin | Unblock a day (public holidays are generated, not removable here). |

### Health

| Endpoint | Description |
| --- | --- |
| `GET /health` | Liveness. Touches nothing. |
| `GET /health/ready` | Readiness — returns 503 when Postgres or Redis is down. |

### Rate limits

Shared across instances via Redis, so limits cannot be multiplied by process count.

| Scope | Limit |
| --- | --- |
| `auth` (login, register, password change) | 10 / 15 min |
| `chat` | 12 / min |
| `quote` | 30 / min |
| `geocoding` | 30 / min |
| global | 300 / min |

---

## Real-time

A Socket.IO gateway shares the API's HTTP server at `/realtime`, with a Redis
adapter so it scales past one instance.

- **The socket is authenticated, not just the page.** The JWT is verified during
  the handshake; an unauthenticated connection is refused.
- **The client never picks its own rooms.** Membership follows from the verified
  identity, so a customer cannot subscribe to someone else's order by guessing an id.
- **Events are emitted after commit**, so no client is told about a change the
  database rolled back.
- **Every event carries a per-room sequence number**, so a client can detect a gap
  after a reconnect.

| Event | Rooms |
| --- | --- |
| `order.created` | `role:staff`, `user:{id}` |
| `order.status_changed` | `role:staff`, `user:{id}`, `order:{id}` |
| `order.confirmed` / `cancelled` / `completed` | as above |
| `availability.changed` | `month:YYYY-MM` |
| `payment.recorded`, `chat.message`, `complaint.message` | scoped per entity |

On the frontend: `useSocket()`, `useRealtimeEvent()`, `useOrderUpdates()` and
`useAvailabilityUpdates()` in `apps/web/lib/useRealtime.ts`.

---

## Getting Started

### 1. Install

```sh
pnpm install
```

### 2. Configure

```sh
cp .env.example .env
```

Then set your database credentials in `DATABASE_URL` and generate two distinct
JWT secrets:

```sh
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET
```

`.env` is gitignored and must never be committed.

### 3. Start Postgres and Redis

```sh
pnpm db:up
```

Postgres listens on `POSTGRES_PORT` (default `5432`) and Redis on `6390`.

> **Ports on this machine.** Other projects already hold `3000` (nginx), `6379`
> (Redis) and `5432` (a Homebrew Postgres serving other databases). So this
> project uses `3200` for the web app, `6390` for Redis, and `POSTGRES_PORT=5433`
> in `.env` for its container — set it before `pnpm db:up`, and keep
> `DATABASE_URL` in agreement with it. Two Postgres servers on one port fails at
> container start with a bind error, which is the good case; the bad one is
> connecting to the wrong server and migrating somebody else's database.
>
> `WEB_ORIGIN` in `.env` must always match the web app's actual origin, or the
> browser blocks every API call with a CORS error.

### 4. Migrate

```sh
pnpm db:migrate
```

### 5. Seed reference data

```sh
pnpm seed
```

### 6. Run

```sh
pnpm dev          # everything
pnpm dev:api      # API only
```

---

## Connecting the frontend to the API

Everything goes through the typed SDK. There are no Next.js route handlers, and
no component builds a URL by hand.

```tsx
"use client";

import { useApi } from "@/lib/api";

export function Example() {
  const { sdk, user, signIn, signOut } = useApi();

  // Anonymous — the calculator works without an account
  const quote = await sdk.quotes.create({ serviceType: "moving", /* … */ });

  // Authenticated — the token is attached automatically
  const orders = await sdk.orders.list({ limit: 25 });

  // Live updates
  useRealtimeEvent("order.created", (envelope) => { /* … */ });
}
```

### Handling errors

Branch on `code`, never on the message text:

```ts
try {
  await sdk.orders.create(input);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.code === "SLOT_TAKEN") { /* the day just filled up */ }
    if (error.code === "QUOTE_EXPIRED") { /* re-price */ }
    if (error.code === "VALIDATION_FAILED") {
      // error.fieldIssues → [{ path, message }] for form fields
    }
  }
}
```

### Hooks available

| Hook | Purpose |
| --- | --- |
| `useApi()` | SDK instance, current user, `signIn` / `signUp` / `signOut` |
| `useSdk()` | The SDK alone |
| `useSocket()` | Raw socket plus connection status |
| `useRealtimeEvent(event, fn)` | Subscribe to one event |
| `useOrderUpdates(id, fn)` | Live status for one order |
| `useAvailabilityUpdates(month, fn)` | Calendar refresh when a day fills |
| `useQuote(input)` | Debounced live pricing |
| `useAvailability(month)` | Month calendar, live |

---

## Outbound email

Mail goes out over SMTP through `@umzugplus/mailer`. The package renders a
template and hands the result to a transport; `MAIL_DRIVER` picks which one.

| Driver | What it does |
| --- | --- |
| `log` | Writes each message to `MAIL_OUTBOX_DIR` as an openable `.html` file and sends nothing. The default outside production. |
| `smtp` | Real delivery over a pooled TLS connection, with two retries on transient failures only. Required in production. |

`log` is not a stub — it is what makes local work possible. Development needs no
credentials, the test suite cannot email a customer by accident, and a network
that blocks outbound SMTP stops being a blocker. It reports `delivered: false`
so a caller can tell that nothing left the machine.

### Templates

Three so far — `otp`, `verify-email`, `password-reset` — each in German,
English, Arabic and Turkish, with an obligatory plain-text alternative (an
HTML-only message reads as bulk mail to every spam filter). Arabic renders
right-to-left, while a one-time code stays `dir="ltr"` inside it: letting an RTL
context reorder the digits hands the customer a code that does not work.

Templates are registered in `packages/mailer/src/templates/registry.ts`, and
`mailer.send` is generic over the key — asking for `otp` with a reset payload
does not compile.

### Setting it up with Namecheap Private Email

1. **DNS first**, because it takes time to propagate. In Advanced DNS for the
   sending domain, use *Auto-configure EMAIL records* → Private Email. That adds
   the MX records and SPF. Add DKIM from the Private Email dashboard, and a
   `_dmarc` TXT record of `v=DMARC1; p=none; rua=mailto:<your address>` —
   tighten `p` once reports look clean. Without these, valid credentials still
   produce mail that lands in spam.
2. **Use an application password**, not the mailbox's master password.
3. **Single-quote it in the env file.** These passwords routinely contain `#`,
   which dotenv reads as the start of a comment and truncates. The symptom is an
   authentication failure with a password that looks correct on screen.
4. `MAIL_FROM` must be on the same domain as `SMTP_USER`, or SPF will not align
   and the message is treated as spoofed.

Host is `mail.privateemail.com`, port 465 with `SMTP_SECURE=true`, or 587 with
`SMTP_SECURE=false`. Unencrypted connections are refused by the server.

### Checking whether it works

```bash
GET  /api/admin/mail/status   # driver, and whether it can connect and authenticate
POST /api/admin/mail/test     # sends a message with an inert 000000 code
```

Both need the `settings.write` permission. In production the config schema
refuses to start at all when `MAIL_DRIVER=smtp` without a host, user and
password — a deployment that boots and silently drops every password reset is
worse than one that refuses to boot.

**If sending times out locally**, check the port before suspecting the code:

```bash
nc -vz mail.privateemail.com 465
```

Most home and mobile networks block outbound 25, 465 and 587. There is no way
around that from the client side — Private Email offers no alternative port — so
verify real delivery from the server, and develop against `MAIL_DRIVER=log`.

## Moving the database to a server

The database runs locally in Docker and is built to transfer without surprises.

### The schema does not need to be copied

It is reproducible from the Drizzle migrations in `packages/db/drizzle/`. A fresh
server needs only:

```sh
pnpm db:migrate    # creates all 23 tables, enums, indexes and constraints
pnpm seed          # rate card, catalog, holidays, discount codes, FAQ, admin
```

That is the preferred route for a first deployment: no dump to carry, and the
server ends up at a known, version-controlled schema.

### When the local data must come along

```sh
pnpm db:dump                  # → backups/umzugplus-<timestamp>.dump
pnpm db:dump --schema-only    # structure only
pnpm db:dump --data-only      # rows only
```

The dump is PostgreSQL custom format: compressed, and selectively restorable.
If `pg_dump` is not installed on your machine, the script runs it inside the
Postgres container instead — no separate install needed on Windows or macOS.

Then on the server:

```sh
scp backups/umzugplus-<timestamp>.dump user@server:/tmp/
ssh user@server
pnpm db:restore /tmp/umzugplus-<timestamp>.dump
pnpm db:migrate               # confirm the schema is at the latest migration
```

`--clean` drops existing objects first and is deliberately opt-in. Against a
production database, or with `--clean`, the restore asks you to type the
database name before it proceeds.

### Running on the server

```sh
cp .env.production.example .env.production   # then fill it in
pnpm prod:up                                 # build and start everything
pnpm prod:logs                               # follow the API log
```

`docker-compose.prod.yml` differs from the development file in ways that matter:

- **No default credentials.** Every secret uses `${VAR:?...}`, so compose refuses
  to start rather than falling back to a value published in this repository.
- **The database is not exposed.** Postgres and Redis have no port mapping at all;
  they are reachable only on the internal network. Connect for maintenance over an
  SSH tunnel: `ssh -L 5433:localhost:5432 user@server`.
- **The API binds to loopback**, so a reverse proxy on the host terminates TLS.
- **Migrations run as their own service**, once, before the API starts.

### Generate fresh secrets for the server

Never reuse a development secret: anyone who has ever had the repository could
otherwise mint valid tokens.

```sh
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 32   # REDIS_PASSWORD
openssl rand -base64 48   # JWT_ACCESS_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET   (must differ from the access secret)
```

### Using a managed database instead

Set `DATABASE_URL` directly and delete the `postgres` service from
`docker-compose.prod.yml`. Managed providers require TLS:

```
DATABASE_URL=postgresql://user:pass@host:5432/umzugplus?sslmode=require
```

### Backups

`pnpm db:dump` on the server writes to `backups/`, which is mounted into the
Postgres container. A nightly cron entry:

```
0 3 * * * cd /srv/umzugplus && pnpm db:dump >> /var/log/umzugplus-backup.log 2>&1
```

A backup you have never restored is a guess. Test one into a scratch database
before you need it.

---

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build every package and app |
| `pnpm test` | Run all test suites |
| `pnpm check-types` | Type-check everything |
| `pnpm lint` | Lint everything |
| `pnpm format` | Format with Prettier |
| `pnpm db:up` / `db:down` | Start / stop Postgres + Redis |
| `pnpm db:reset` | Stop and **delete** the volumes |
| `pnpm db:dump` | Export the database to `backups/` |
| `pnpm db:restore <file>` | Restore a dump |
| `pnpm db:psql` | Open a psql shell in the container |
| `pnpm prod:up` / `prod:down` | Start / stop the production stack |
| `pnpm prod:logs` | Follow the production API log |
| `pnpm prod:migrate` | Run migrations on the server |
| `pnpm db:generate` | Generate a migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm seed` | Seed reference data |

---

## Design decisions worth knowing

**A calendar day is never a timestamp.** The previous implementation derived
booking days with `toISOString().slice(0, 10)`, which converts to UTC. Built at
local midnight in Germany, every day rolled back by one: clicking 15 July booked
14 July, and capacity was counted against the wrong day. `packages/core/calendar-date`
treats a day as a label, and the database columns are `date`. There are
regression tests pinning this.

**Public holidays are computed, not listed.** The old hardcoded set covered 2026
only; on 1 January 2027 every holiday would silently have become a bookable
working day. They are now derived from Easter for any year.

**The server prices, the client asks.** `POST /api/quotes` returns a persisted
`quote_id`; order creation references that id and the server re-reads the stored
total. The browser never states a price, and the rate card is never sent to it.

**Capacity is enforced in a transaction.** Availability rules in `core` decide
what to *render*; the booking itself re-checks capacity under a row lock and
returns `409 SLOT_TAKEN`, so two customers cannot take the last slot.

**Money is integer cents.** `numeric(10,2)` in Postgres, integer arithmetic in
the engine, formatted once at the edge.
