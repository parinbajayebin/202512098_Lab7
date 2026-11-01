# Root Dockerfile for Cloud Platforms (Render / Railway)
FROM node:22-alpine

WORKDIR /app

# Copy package definitions from api-gateway
COPY api-gateway/package*.json ./

# Install production dependencies
RUN npm install --production

# Copy api-gateway source code
COPY api-gateway/ ./

# Expose Gateway Port
EXPOSE 8080

# Start API Gateway
CMD ["node", "server.js"]
