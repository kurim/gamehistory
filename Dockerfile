# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# better-sqlite3 and argon2 compile native bindings during npm install.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY . .
# SvelteKit's postbuild analysis step imports every server module in a bare
# Node process (no .env loaded, matching .dockerignore excluding it from the
# build context). db/index.ts eagerly requires DATABASE_URL to construct the
# sqlite client, so give it a throwaway value just to get past that check —
# the real value is injected as a container env var at runtime and takes
# over (see docker-compose.yml's `env_file`).
ENV DATABASE_URL=file:./build-analysis-placeholder.db
RUN npm run build && rm -f build-analysis-placeholder.db
RUN npm prune --omit=dev

# ---- Runtime stage --------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Version string baked in at build time (see .github/workflows/docker-build.yml,
# derived via `git describe` — a release tag like "v1.2.3" when built from one,
# otherwise "v1.2.3-N-gSHA" or a bare commit sha). Shown in the UI so you can
# tell which build is currently deployed and notice when it changes after a
# redeploy. Falls back to "dev" for local builds.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle

# .env is injected as container environment variables at startup (see
# docker-compose.yml's `env_file`, or `docker run --env-file`) — it never
# needs to be copied into the image or mounted into the container's filesystem.
# data/ (SQLite db + downloaded covers) is meant to be bind-mounted in.
EXPOSE 3000
CMD ["node", "build/index.js"]
