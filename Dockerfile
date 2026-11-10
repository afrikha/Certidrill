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

# ---- runtime
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
