# civenro-backend/Dockerfile
FROM node:23-alpine

WORKDIR /app

# 1. Install the compatibility package so libssl.so.1.1 is available
RUN apk add --no-cache openssl1.1-compat

# 2. Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# 3. Copy the rest of the backend code
COPY . .

# 4. Build the TypeScript code (if needed)
RUN npm run build

# 5. Expose the port the backend runs on
EXPOSE 5001

# 6. Default command
CMD ["node", "dist/index.js"]
