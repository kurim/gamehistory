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
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime stage --------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# .env is injected as container environment variables at startup (see
# docker-compose.yml's `env_file`, or `docker run --env-file`) — it never
# needs to be copied into the image or mounted into the container's filesystem.
# data/ (SQLite db + downloaded covers) is meant to be bind-mounted in.
EXPOSE 3000
CMD ["node", "build/index.js"]
