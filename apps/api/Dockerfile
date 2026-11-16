# syntax=docker/dockerfile:1

# Build from the repository root so the pnpm workspace is available:
#   docker build -f apps/api/Dockerfile -t postlotl-api .

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
  pnpm install --frozen-lockfile --filter api...

FROM deps AS build
COPY apps/api apps/api
RUN pnpm --filter api build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm --filter api deploy --prod /out \
  && cp -r apps/api/dist /out/dist

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
  PORT=5200
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 5200
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "dist/index.js"]
