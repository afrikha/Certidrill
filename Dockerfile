# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && apt-get clean
WORKDIR /app

# ---- dependencies
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
RUN npm ci

# ---- build
FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- one-shot job: migrations + seed (content/ is the source of truth)
FROM deps AS migrator
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy && npm run seed"]

# ---- kubectl: the practical exercises (CKAD, CKA) are graded with it, offline
# (lib/exercises/kubectl.ts). Pinned version, checksum verified by the script.
FROM base AS kubectl
ARG TARGETARCH
COPY scripts/install-kubectl.sh /tmp/install-kubectl.sh
RUN TARGETARCH=${TARGETARCH} sh /tmp/install-kubectl.sh /usr/local/bin/kubectl

# ---- runtime
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=kubectl /usr/local/bin/kubectl /usr/local/bin/kubectl
# The deployed version (lib/version.ts): `git describe --tags` on the server,
# passed by docker compose (README, "Version"). In the last stage only: a new
# version rebuilds nothing but this stage.
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
