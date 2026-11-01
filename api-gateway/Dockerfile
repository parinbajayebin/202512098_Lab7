# Base Image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy all files into /app
COPY . .

# If built from repository root (e.g. Render / Cloud), bring api-gateway files to /app
RUN if [ -d "api-gateway" ]; then cp -rf api-gateway/* . && rm -rf api-gateway user-service product-service order-service k8s monitoring; fi

# Install dependencies
RUN npm install --production

# Expose Gateway Port
EXPOSE 8080

# Startup command
CMD ["node", "server.js"]
