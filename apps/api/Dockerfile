# Multi-stage build for the API.
#
# Built from the repository root so the workspace packages the API depends on
# (@umzugplus/core, /db, /auth, /config) are available:
#
#   docker build -f apps/api/Dockerfile -t umzugplus-api .

# ── Stage 1: install every dependency, including dev ──────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@10.4.0 --activate

# argon2 is a native module and needs a toolchain to build from source when no
# prebuild matches the platform.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy only the manifests first, so a source-only change does not invalidate
# the dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN pnpm install --frozen-lockfile

# ── Stage 2: compile TypeScript ───────────────────────────────────────────
FROM deps AS build

WORKDIR /app

COPY tsconfig*.json turbo.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Dependency order matters: config → core → db → auth → api.
RUN pnpm --filter @umzugplus/config build \
 && pnpm --filter @umzugplus/core build \
 && pnpm --filter @umzugplus/db build \
 && pnpm --filter @umzugplus/auth build \
 && pnpm --filter @umzugplus/api build

# Drop dev dependencies now that compilation is done.
RUN pnpm prune --prod

# ── Stage 3: runtime ──────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# tini reaps zombies and forwards signals, so SIGTERM reaches Node and the
# graceful shutdown in src/index.ts actually runs.
RUN apk add --no-cache tini

# Never run as root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S api -G nodejs

WORKDIR /app

COPY --from=build --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=api:nodejs /app/package.json ./package.json
COPY --from=build --chown=api:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=api:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=api:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=api:nodejs /app/packages ./packages

USER api

ENV NODE_ENV=production
EXPOSE 4000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/index.js"]
