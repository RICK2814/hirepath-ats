# pinned minor for reproducible builds; bump on purpose. Node 22.18+ is required.
FROM node:22.22-slim
# openssl is needed by Prisma's migration engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# schema + scripts come first because `npm install` runs `prisma generate` (postinstall)
COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm install --omit=dev
COPY . .
RUN chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# apply pending migrations, then start (safe to run on every boot and from several instances)
# exec: node becomes PID 1 so it receives SIGTERM and shuts down gracefully
CMD ["sh", "-c", "npx prisma migrate deploy && exec node server.ts"]
