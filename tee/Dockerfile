# syntax=docker/dockerfile:1
# Phala dstack / Intel SGX/TDX Enclave Container for Flare Confidential Compute
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
ENV FLARE_REGISTRY_ADDRESS=0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019

# Security: Enclave non-root execution
RUN addgroup -g 1001 -S nodejs && adduser -S teeuser -u 1001
USER teeuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080

CMD ["node", "dist/index.js"]
