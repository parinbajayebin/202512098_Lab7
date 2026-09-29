const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[Product Service] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Database per Service: In-memory store owned solely by Product Service
let products = [
  { id: "501", name: "Engineering Mathematics Volume 1 (B.S. Grewal)", price: 650.00, stock: 35 },
  { id: "502", name: "Casio FX-991CW Scientific Calculator", price: 1295.00, stock: 40 },
  { id: "503", name: "Classmate Spiral Practical Lab Notebook", price: 120.00, stock: 150 }
];

// Health check / Service info
const healthHandler = (req, res) => {
  res.status(200).json({
    service: 'Product Service',
    status: 'UP',
    port: PORT,
    timestamp: new Date().toISOString()
  });
};
app.get('/', healthHandler);
app.get('/health', healthHandler);

// GET /products - Retrieve all products
app.get('/products', (req, res) => {
  res.status(200).json(products);
});

// GET /products/:id - Retrieve product by ID
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({
      error: 'Product Not Found',
      message: `No product exists with ID: ${req.params.id}`
    });
  }
  res.status(200).json(product);
});

// POST /products - Create new product
app.post('/products', (req, res) => {
  const { name, price, stock } = req.body;
  
  if (!name || price === undefined) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Name and price are required fields.'
    });
  }

  const newId = (products.length > 0 ? Math.max(...products.map(p => parseInt(p.id) || 0)) + 1 : 501).toString();
  const newProduct = {
    id: newId,
    name,
    price: Number(price),
    stock: stock !== undefined ? Number(stock) : 0
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT /products/:id - Update existing product
app.put('/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      error: 'Product Not Found',
      message: `No product exists with ID: ${req.params.id}`
    });
  }

  const { name, price, stock } = req.body;
  products[index] = {
    ...products[index],
    name: name !== undefined ? name : products[index].name,
    price: price !== undefined ? Number(price) : products[index].price,
    stock: stock !== undefined ? Number(stock) : products[index].stock
  };

  res.status(200).json(products[index]);
});

// DELETE /products/:id - Delete product
app.delete('/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      error: 'Product Not Found',
      message: `No product exists with ID: ${req.params.id}`
    });
  }

  const deletedProduct = products.splice(index, 1)[0];
  res.status(200).json({
    message: `Product with ID ${req.params.id} successfully deleted.`,
    product: deletedProduct
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================`);
  console.log(`🚀 Product Service running on port ${PORT}`);
  console.log(`===========================================`);
});
