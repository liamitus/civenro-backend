# civenro-backend/Dockerfile

FROM node:23-alpine

WORKDIR /app

# 1. Install the compatibility package so libssl.so.1.1 is available
RUN apk add --no-cache openssl1.1-compat

# 2. Install dependencies
COPY package*.json ./
RUN npm ci

# 3. Copy code & generate Prisma client & build
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 5001
CMD ["node", "dist/index.js"]
