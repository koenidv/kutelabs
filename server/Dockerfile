FROM oven/bun:alpine AS base
WORKDIR /app

# TODO .dockerignore
# TODO install runsc
# todo env vars do not seem to be set

FROM base AS builder
RUN apk add --no-cache jq
COPY . .
RUN bun bun.lockb > yarn.lock
RUN sed -i 's/"packageManager": "bun@[0-9.]*"/"packageManager": "yarn@1.22.22"/' package.json
RUN rm bun.lockb
RUN bunx turbo@^2 prune @kutelabs/server --docker
RUN jq '.workspaces = '"$(find out/json/ -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | jq -R . | jq -s .)" out/json/package.json > tmp.json && mv tmp.json out/json/package.json

FROM base AS installer
COPY --from=builder /app/out/json .
RUN bun install --yarn --frozen-lockfile --production
COPY --from=builder /app/out/full .

FROM base AS runner
RUN apk add --no-cache docker-cli
VOLUME [ "/data", "/var/run/docker.sock" ]

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/server ./server
COPY --from=installer /app/shared ./shared
COPY --from=installer /app/package.json .

ENV ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000
WORKDIR /app/server
CMD ["bun", "run", "src/index.ts"]