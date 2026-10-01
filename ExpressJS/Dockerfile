FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
# bcrypt can compile from source when its prebuilt binary is unavailable.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
RUN node -e "const b = require('bcrypt'); if (!b.compareSync('smoke', b.hashSync('smoke', 4))) process.exit(1)"

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8080 FILE_LOCAL_ROOT=/app/storage/private
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
RUN mkdir -p /app/storage/private && chown -R node:node /app/storage
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
