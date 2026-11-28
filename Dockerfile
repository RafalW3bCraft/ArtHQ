FROM node:22.23.5-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_GOOGLE_ENABLED=false
RUN pnpm build
RUN pnpm prune --prod
FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:c73ddeb03e1dc2d579aa111c83d6699c6b8b487e35c0c631d4a3a20229fc25ee AS node-runtime
# Node embeds OpenSSL and does not load Debian's separate libssl. Keep only
# the C++ runtime dependencies it loads, with their inventory and licenses.
FROM gcr.io/distroless/base-nossl-debian13:nonroot@sha256:4006ac92504be607b70de01d1f64f38288c69fcd8faa820f6d3aed266ea32ac5
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=node-runtime /nodejs /nodejs
COPY --from=node-runtime /usr/lib/*-linux-gnu/libstdc++.so.6* /usr/lib/
COPY --from=node-runtime /usr/lib/*-linux-gnu/libgcc_s.so.1 /usr/lib/
COPY --from=node-runtime /var/lib/dpkg/status.d/gcc-14-base* /var/lib/dpkg/status.d/
COPY --from=node-runtime /var/lib/dpkg/status.d/libgcc-s1* /var/lib/dpkg/status.d/
COPY --from=node-runtime /var/lib/dpkg/status.d/libstdc++6* /var/lib/dpkg/status.d/
COPY --from=node-runtime /usr/share/doc /usr/share/doc
COPY --from=build --chown=65532:65532 /app/dist ./dist
COPY --from=build --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=build --chown=65532:65532 /app/package.json ./package.json
COPY --from=build --chown=65532:65532 /app/scripts/smoke-image.mjs ./scripts/smoke-image.mjs
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/nodejs/bin/node"]
CMD ["dist/index.js"]
