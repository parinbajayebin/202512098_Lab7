const express = require('express');
const cors = require('cors');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

// ==========================================
// Part B: Configuration-Based Service Registry
// ==========================================
const serviceRegistry = {
  userService: process.env.USER_SERVICE_URL || 'http://user-service:3001',
  productService: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
  orderService: process.env.ORDER_SERVICE_URL || 'http://order-service:3003'
};

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[API Gateway] ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Universal Forwarding Helper (Forwards full URL like /products/501)
async function forwardToService(targetBaseUrl, req, res, serviceName) {
  const targetUrl = `${targetBaseUrl}${req.originalUrl}`;
  console.log(`[API Gateway] Forwarding ${req.method} -> ${targetUrl}`);

  try {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    // Abort after 4 seconds if service is down
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    options.signal = controller.signal;

    const response = await fetch(targetUrl, options);
    clearTimeout(timeoutId);

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error(`[API Gateway Error] Could not reach ${serviceName} at ${targetUrl}:`, err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: `API Gateway could not connect to ${serviceName}. The upstream service is either offline or unreachable.`,
      targetService: serviceName,
      targetUrl: targetUrl
    });
  }
}

// ==========================================
// Gateway Endpoints & Routing Table
// ==========================================

// 1. Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    gateway: 'CampusConnect API Gateway',
    status: 'HEALTHY',
    port: PORT,
    timestamp: new Date().toISOString(),
    serviceRegistry
  });
});

// Prometheus Metrics Endpoint
app.get('/metrics', metricsEndpoint);

// 2. Route /users -> User Service
app.all('/users', (req, res) => forwardToService(serviceRegistry.userService, req, res, 'User Service'));
app.all('/users/*', (req, res) => forwardToService(serviceRegistry.userService, req, res, 'User Service'));

// 3. Route /products -> Product Service
app.all('/products', (req, res) => forwardToService(serviceRegistry.productService, req, res, 'Product Service'));
app.all('/products/*', (req, res) => forwardToService(serviceRegistry.productService, req, res, 'Product Service'));

// 4. Route /orders -> Order Service
app.all('/orders', (req, res) => forwardToService(serviceRegistry.orderService, req, res, 'Order Service'));
app.all('/orders/*', (req, res) => forwardToService(serviceRegistry.orderService, req, res, 'Order Service'));

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `Path '${req.originalUrl}' is not registered on the API Gateway.`
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📍 Service Registry:`);
  console.log(`   - User Service:    ${serviceRegistry.userService}`);
  console.log(`   - Product Service: ${serviceRegistry.productService}`);
  console.log(`   - Order Service:   ${serviceRegistry.orderService}`);
  console.log(`==================================================`);
});
