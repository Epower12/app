# Dockerfile for a Next.js 13+ App with "standalone" output mode

# 1. Base image for installing dependencies and building the app
FROM node:20-alpine AS base

# This is the directory where our app will live in the container
WORKDIR /app

# 2. Install dependencies
# Use a separate 'deps' stage to leverage Docker's caching mechanism.
# Dependencies are only re-installed when package files change.
FROM base AS deps
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# 3. Build the application
# This stage copies the dependencies and source code to build the final app.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# This will leverage the "output: standalone" configuration in next.config.ts
RUN npm run build

# 4. Production image
# This is the final, minimal image that will be deployed.
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# The default command to run when starting the container
CMD ["node", "server.js"]