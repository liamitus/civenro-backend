# Dockerfile
FROM node:23-bullseye

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy code & build
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 5001
CMD ["node", "dist/index.js"]
