# Territory Rush API — NestJS modular monolith (serves HTTP and runs the in-process
# BullMQ ingestion worker in the same process).
#
# Build context is the monorepo root (Railway: build.dockerfilePath = apps/api/Dockerfile),
# so every path below is relative to the repo root. supabase/migrations ships next to
# apps/api/dist so the migration runner resolves ../../../../supabase/migrations at runtime.

# ---- production dependencies ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev --workspace @territory-rush/api --include-workspace-root

# ---- build ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --workspace @territory-rush/api --include-workspace-root
COPY apps/api apps/api
RUN npm run build --workspace @territory-rush/api

# ---- runtime ----
FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY package.json ./package.json
COPY apps/api/package.json ./apps/api/package.json
COPY supabase/migrations ./supabase/migrations
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
