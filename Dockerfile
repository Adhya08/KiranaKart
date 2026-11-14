# syntax=docker/dockerfile:1
# Hardened multi-stage Dockerfile
# Controls: C-A05-04 (non-root user), C-A06-02 (pinned base image)

FROM node:24-alpine AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Stage 2: Final Runtime Image
FROM node:24-alpine AS release
WORKDIR /app

# Security: Create non-privileged service user and group
RUN addgroup -S -g 1001 kiranakart && \
    adduser -S -u 1001 -G kiranakart kiranakart

# Copy dependencies and application source
COPY --from=dependencies /app/node_modules ./node_modules
COPY --chown=kiranakart:kiranakart . .

# Set immutable ownership and safe permissions
RUN mkdir -p /app/storage_uploads_safe && \
    chown -R kiranakart:kiranakart /app

# Drop root privileges (C-A05-04)
USER kiranakart

# Production environment variables (C-A05-03)
ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# Healthcheck configuration (HN-08)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["node", "backend/src/server.js"]
