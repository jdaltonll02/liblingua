FROM node:20-alpine

WORKDIR /app

# OpenSSL is required by the Prisma query engine on Alpine
RUN apk add --no-cache openssl

# Install ALL deps so prisma CLI is available for migrations
# Use npm install (not npm ci) so new packages not yet in the lock file are resolved
COPY package*.json ./
RUN npm install

# Generate Prisma client before copying app source
COPY prisma ./prisma/
RUN npx prisma generate

COPY jest.config.js jest.setup.js ./
COPY __mocks__ ./__mocks__/
COPY src ./src/

EXPOSE 4000

# Push schema to DB, seed once (idempotent), then start
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node /scripts/seed.js && node src/index.js"]
