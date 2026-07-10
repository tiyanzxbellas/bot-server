# Use Node.js 20 base image
FROM node:20-slim

# Install system dependencies including FFmpeg (essential for WhatsApp bot sticker & media processing)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    graphicsmagick \
    imagemagick \
    webp \
    git \
    build-essential \
    python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root configurations and package manifests
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY metadata.json ./

# Install root dependencies
RUN npm ci

# Copy bot directory and install bot dependencies
COPY bot ./bot
RUN cd bot && npm install --legacy-peer-deps

# Copy server code and client source files
COPY server.ts ./
COPY src ./src

# Build frontend assets and compile backend server to dist/server.cjs
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Set environment variable to production
ENV NODE_ENV=production

# Start the unified dashboard and bot manager
CMD ["npm", "start"]
