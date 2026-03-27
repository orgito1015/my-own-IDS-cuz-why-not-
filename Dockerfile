# ----- Build stage -----
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, pcap)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ----- Runtime stage -----
FROM node:20-slim AS runtime

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpcap0.8 \
    && rm -rf /var/lib/apt/lists/*

# Copy only production dependencies + compiled output
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Ensure data and logs directories exist
RUN mkdir -p data/monitored logs

# Run as non-root for least privilege (network capture requires cap_net_raw)
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
