# Deskive Frontend Dockerfile
# Multi-stage build for different environments

# =============================================
# Base stage - Common dependencies
# =============================================
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S react -u 1001

# Copy package files
COPY package*.json ./

# =============================================
# Dependencies stage - Install all dependencies
# =============================================
FROM base AS deps

# Install all dependencies (including dev dependencies)
RUN npm install && npm cache clean --force

# =============================================
# Build stage - Build the application
# =============================================
FROM base AS build

# Copy all dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# =============================================
# Development stage - For development environment
# =============================================
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY . .

# Change ownership to nodejs user
RUN chown -R react:nodejs /app
USER react

# Expose port
EXPOSE 5175

# Start the application in development mode
CMD ["dumb-init", "npm", "run", "dev", "--", "--host", "0.0.0.0"]

# =============================================
# Production stage - For production environment
# =============================================
FROM nginx:alpine AS production

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
