# Base Image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source code
COPY . .

# Expose Gateway Port
EXPOSE 8080

# Startup command
CMD ["node", "server.js"]
