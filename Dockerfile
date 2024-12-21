# civenro-backend/Dockerfile
FROM node:23-slim

# 1. Create app directory
WORKDIR /app

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
