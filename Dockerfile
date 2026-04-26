FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x

RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget procps \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate \
  && ln -sf /app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x /app/node_modules/@prisma/engines/schema-engine-debian-openssl-1.1.x \
  && ln -sf /app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node /app/node_modules/@prisma/engines/libquery_engine-debian-openssl-1.1.x.so.node \
  && ln -sf /app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x /app/node_modules/prisma/schema-engine-debian-openssl-1.1.x \
  && ln -sf /app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node /app/node_modules/prisma/libquery_engine-debian-openssl-1.1.x.so.node

FROM base AS development
ENV NODE_ENV=development

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json jest.config.ts eslint.config.js .prettierrc .editorconfig ./
COPY scripts ./scripts
COPY src ./src
COPY test ./test

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS builder
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/prisma ./prisma
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x

RUN apt-get update \
  && apt-get upgrade -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 appgroup \
  && useradd --uid 1001 --gid appgroup --shell /bin/sh --no-create-home appuser

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=10 --start-period=20s \
  CMD wget -q -O - http://127.0.0.1:3000/api/health > /dev/null 2>&1 || exit 1

# tsconfig.json `include` covers `src/**/*.ts` AND `prisma/**/*.ts` (so seeds
# are buildable for `prisma db seed`). With both rootDirs in scope, TypeScript
# preserves the directory prefix in `dist/` — output is `dist/src/main.js` and
# `dist/prisma/seed.js`. Do NOT change to `dist/main.js` without first
# excluding `prisma/**/*.ts` from tsconfig.build.json (which breaks seeding).
CMD ["node", "dist/src/main.js"]
