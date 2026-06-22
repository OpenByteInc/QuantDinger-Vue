# QuantDinger Frontend — multi-arch image published to GHCR.
#
# Stage 1 (builder) is pinned to --platform=$BUILDPLATFORM so the Vue build
# runs once natively on the host (typically linux/amd64 on GitHub Actions),
# NOT twice with the arm64 manifest entry forced through QEMU emulation
# (~5–10× slower). The build output (/app/dist) is pure static JS/CSS,
# byte-identical across architectures; the nginx stage just COPYs those
# files into each target arch's base image.
#
# Stage 2 (nginx) runs once per --platform target listed by buildx, but
# does no compilation — only file copies and a small apk add — so the
# arm64 manifest entry is cheap.

ARG NODE_IMAGE=node:18-alpine
ARG NGINX_IMAGE=nginx:1.25-alpine

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder
ARG APP_VERSION=""
ARG GIT_TAG=""
WORKDIR /app

# git is needed at build time so vite.config.js can stamp the short hash.
# corepack ships with Node 16.13+; `enable` installs the pnpm shim. The
# concrete pnpm version is pinned by `packageManager` in package.json,
# which corepack auto-downloads on first use.
RUN apk add --no-cache git && corepack enable

# Copy lockfile + manifest + workspace config first so the install layer caches.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN if [ -n "$APP_VERSION" ] || [ -n "$GIT_TAG" ]; then \
      APP_VERSION="$APP_VERSION" GIT_TAG="$GIT_TAG" pnpm build; \
    else \
      pnpm build; \
    fi

FROM ${NGINX_IMAGE}

RUN apk add --no-cache curl

# Pin the envsubst filter so only ${BACKEND_URL} is substituted — otherwise
# nginx's own $-variables ($host, $remote_addr, ...) would also be clobbered.
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL \
    BACKEND_URL=http://backend:5000

COPY deploy/nginx-docker.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
