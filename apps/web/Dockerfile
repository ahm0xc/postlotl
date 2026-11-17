# syntax=docker/dockerfile:1

# Build from the repository root so the pnpm workspace is available:
#   docker build -f apps/web/Dockerfile -t postlotl-web .

FROM node:22-alpine AS base
RUN corepack enable \
  && pnpm config set store-dir /pnpm/store
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/math/package.json packages/math/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter web...

FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
  PORT=5100
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.output ./
USER node
EXPOSE 5100
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1
CMD ["node", "server/index.mjs"]
