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

# Add entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 5001

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/index.js"]
