# Build stage
FROM node:22.12-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy source files
COPY src /app/src
COPY package.json pnpm-lock.yaml tsconfig.json /app/

WORKDIR /app

# Install dependencies
RUN pnpm install

# Build the application
RUN pnpm run build

# Production stage
FROM node:22-alpine AS release

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy built files and package files
COPY --from=builder /app/build /app/build
COPY --from=builder /app/package.json /app/
COPY --from=builder /app/pnpm-lock.yaml /app/

ENV NODE_ENV=production

WORKDIR /app

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Run the application
ENTRYPOINT ["node", "build/index.js"]
