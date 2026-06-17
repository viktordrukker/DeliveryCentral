FROM node:20-alpine AS base
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH

RUN apk update && apk upgrade --no-cache

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS development
WORKDIR /app
ENV PATH=/app/node_modules/.bin:$PATH
ENV NODE_ENV=development

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY test ./test

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production

# v2-staging preview: pass `--build-arg VITE_FORCE_FLAGS_ON=workspaceMe,dsRefresh`
# (or `VITE_FORCE_ALL_FLAGS_ON=true`) when building the DS-refresh preview image.
# Prod + regular staging leave these empty, so callers see registry defaults.
ARG VITE_FORCE_FLAGS_ON=""
ARG VITE_FORCE_ALL_FLAGS_ON=""
ENV VITE_FORCE_FLAGS_ON=$VITE_FORCE_FLAGS_ON
ENV VITE_FORCE_ALL_FLAGS_ON=$VITE_FORCE_ALL_FLAGS_ON

# Demo stand: pass `--build-arg VITE_DEMO_MODE=true` to render the one-click
# role selector on the login page. Prod + regular staging leave this empty.
ARG VITE_DEMO_MODE=""
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM nginx:1.27-alpine AS production

RUN apk update && apk upgrade --no-cache \
  && rm -rf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/app.conf

# INFRA-08: run nginx as the unprivileged `nginx` user. The official image
# already includes the user; running the master non-root requires listening on
# an unprivileged port (>1024), which nginx.conf now does (8080). Pre-create
# the runtime directories the master needs to write to with the right owner.
RUN chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html /etc/nginx/conf.d \
  && touch /var/run/nginx.pid \
  && chown nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O - http://127.0.0.1:8080/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
