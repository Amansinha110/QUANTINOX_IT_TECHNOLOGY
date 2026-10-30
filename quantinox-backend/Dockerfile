# Quantinox backend — small production image
FROM node:22-alpine
ENV NODE_ENV=production PORT=4000 HOST=0.0.0.0 DATABASE_FILE=/app/data/quantinox.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY admin ./admin
COPY scripts ./scripts
COPY knowledge ./knowledge
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
VOLUME ["/app/data"]
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
