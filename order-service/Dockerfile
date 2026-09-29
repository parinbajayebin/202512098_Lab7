# Base Image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application source code
COPY . .

# Expose service port
EXPOSE 3003

# Start the application
CMD ["node", "server.js"]
