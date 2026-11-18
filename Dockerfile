# syntax=docker/dockerfile:1

# ---------- build the web client ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---------- runtime ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/matchvision.db \
    ENABLE_CODE_EXPLORER=false

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server.ts tsconfig.json ./
COPY server ./server
COPY ai ./ai
COPY pipeline ./pipeline
COPY config ./config
COPY tests ./tests
COPY main.py requirements.txt ./

RUN mkdir -p /data && chown -R 1000:1000 /app /data
USER 1000:1000
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.ts"]
