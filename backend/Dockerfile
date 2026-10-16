# ==============================================================================
# FocusForge Backend Production Dockerfile
# Multi-stage lightweight Node.js 22 Alpine build
# ==============================================================================

# Stage 1: Install production dependencies
FROM node:22-alpine AS dependencies
WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts; \
    else \
      npm install --omit=dev --ignore-scripts; \
    fi

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

# Set production environment defaults
ENV NODE_ENV=production \
    PORT=5001 \
    DB_PATH=/app/data/focusforge.db

# Create application directories and set up permissions for non-root node user
RUN mkdir -p /app/data && chown -R node:node /app

# Copy dependencies and application source
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# Expose backend service port
EXPOSE 5001

# Run container as non-root node user for security
USER node

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

# Start the FocusForge Backend API server
CMD ["node", "src/server.js"]
