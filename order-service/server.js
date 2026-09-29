const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3003;

// Environment-configured upstream service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[Order Service] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Database per Service: In-memory store owned solely by Order Service
let orders = [
  {
    id: "1001",
    userId: "101",
    user: {
      id: "101",
      name: "Aarav Sharma",
      email: "aarav.sharma@campus.edu.in"
    },
    items: [
      {
        productId: "501",
        name: "Engineering Mathematics Volume 1 (B.S. Grewal)",
        price: 650.00,
        quantity: 1,
        subtotal: 650.00
      }
    ],
    totalAmount: 650.00,
    status: "CONFIRMED",
    createdAt: "2026-10-01T10:00:00.000Z"
  }
];

// Helper: Fetch with timeout for inter-service calls
async function fetchWithTimeout(url, options = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Health check / Service info
const healthHandler = (req, res) => {
  res.status(200).json({
    service: 'Order Service',
    status: 'UP',
    port: PORT,
    dependencies: {
      userServiceUrl: USER_SERVICE_URL,
      productServiceUrl: PRODUCT_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
};
app.get('/', healthHandler);
app.get('/health', healthHandler);

// GET /orders - Retrieve all orders
app.get('/orders', (req, res) => {
  res.status(200).json(orders);
});

// GET /orders/:id - Retrieve order by ID
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({
      error: 'Order Not Found',
      message: `No order exists with ID: ${req.params.id}`
    });
  }
  res.status(200).json(order);
});

// POST /orders - Create order with inter-service validation
app.post('/orders', async (req, res) => {
  const { userId, items } = req.body;

  // 1. Basic validation
  if (!userId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'userId and a non-empty items array [ { productId, quantity } ] are required.'
    });
  }

  // 2. Inter-Service Communication: Validate User with User Service
  let userData;
  try {
    const userUrl = `${USER_SERVICE_URL}/users/${userId}`;
    console.log(`[Order Service] Requesting User info from: ${userUrl}`);
    
    const userRes = await fetchWithTimeout(userUrl);
    
    if (userRes.status === 404) {
      return res.status(404).json({
        error: 'User Not Found',
        message: `User Service confirmed user ID '${userId}' does not exist.`
      });
    }

    if (!userRes.ok) {
      return res.status(502).json({
        error: 'Bad Gateway',
        message: `User Service returned unexpected status: ${userRes.status}`
      });
    }

    userData = await userRes.json();
  } catch (err) {
    console.error(`[Order Service Error] User Service communication failed:`, err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Failed to communicate with User Service. The service may be offline or unreachable.',
      targetService: 'User Service',
      targetUrl: `${USER_SERVICE_URL}/users/${userId}`
    });
  }

  // 3. Inter-Service Communication: Validate each Product with Product Service
  const validatedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Each item must have a valid productId and quantity (> 0).'
      });
    }

    try {
      const productUrl = `${PRODUCT_SERVICE_URL}/products/${item.productId}`;
      console.log(`[Order Service] Requesting Product info from: ${productUrl}`);

      const prodRes = await fetchWithTimeout(productUrl);

      if (prodRes.status === 404) {
        return res.status(404).json({
          error: 'Product Not Found',
          message: `Product Service confirmed product ID '${item.productId}' does not exist.`
        });
      }

      if (!prodRes.ok) {
        return res.status(502).json({
          error: 'Bad Gateway',
          message: `Product Service returned unexpected status: ${prodRes.status}`
        });
      }

      const prodData = await prodRes.json();

      // Check stock availability
      if (prodData.stock !== undefined && prodData.stock < item.quantity) {
        return res.status(400).json({
          error: 'Insufficient Stock',
          message: `Only ${prodData.stock} units available for product '${prodData.name}'. Requested: ${item.quantity}`
        });
      }

      const subtotal = Number((prodData.price * item.quantity).toFixed(2));
      totalAmount += subtotal;

      validatedItems.push({
        productId: prodData.id,
        name: prodData.name,
        price: prodData.price,
        quantity: item.quantity,
        subtotal: subtotal
      });

    } catch (err) {
      console.error(`[Order Service Error] Product Service communication failed:`, err.message);
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Failed to communicate with Product Service. The service may be offline or unreachable.',
        targetService: 'Product Service',
        targetUrl: `${PRODUCT_SERVICE_URL}/products/${item.productId}`
      });
    }
  }

  // 4. Create and Save Order
  const newOrderId = (orders.length > 0 ? Math.max(...orders.map(o => parseInt(o.id) || 0)) + 1 : 1001).toString();
  const newOrder = {
    id: newOrderId,
    userId: userData.id,
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email
    },
    items: validatedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
    status: 'CONFIRMED',
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  console.log(`[Order Service] ✅ Order created successfully: ID ${newOrderId}`);
  res.status(201).json(newOrder);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 Order Service running on port ${PORT}`);
  console.log(`🔗 User Service URL:    ${USER_SERVICE_URL}`);
  console.log(`🔗 Product Service URL: ${PRODUCT_SERVICE_URL}`);
  console.log(`=========================================`);
});
