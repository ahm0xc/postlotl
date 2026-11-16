# syntax=docker/dockerfile:1

# Build from the repository root so the pnpm workspace is available:
#   docker build -f apps/dashboard/Dockerfile -t postlotl-dashboard .

FROM node:22-alpine AS base
RUN corepack enable \
  && pnpm config set store-dir /pnpm/store
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/math/package.json packages/math/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter dashboard...

FROM deps AS build
COPY apps/dashboard apps/dashboard
RUN pnpm --filter dashboard build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
  PORT=5100
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/dashboard/.output ./
USER node
EXPOSE 5100
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ || exit 1
CMD ["node", "server/index.mjs"]
