const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[User Service] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Database per Service: In-memory store owned solely by User Service
let users = [
  { id: "101", name: "Aarav Sharma", email: "aarav.sharma@campus.edu.in", role: "student" },
  { id: "102", name: "Priya Patel", email: "priya.patel@campus.edu.in", role: "instructor" },
  { id: "103", name: "Rohan Verma", email: "rohan.verma@campus.edu.in", role: "student" }
];

// Health check / Service info
const healthHandler = (req, res) => {
  res.status(200).json({
    service: 'User Service',
    status: 'UP',
    port: PORT,
    timestamp: new Date().toISOString()
  });
};
app.get('/', healthHandler);
app.get('/health', healthHandler);

// GET /users - Retrieve all users
app.get('/users', (req, res) => {
  res.status(200).json(users);
});

// GET /users/:id - Retrieve user by ID
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({
      error: 'User Not Found',
      message: `No user exists with ID: ${req.params.id}`
    });
  }
  res.status(200).json(user);
});

// POST /users - Create new user
app.post('/users', (req, res) => {
  const { name, email, role } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Name and email are required fields.'
    });
  }

  const newId = (users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) + 1 : 101).toString();
  const newUser = {
    id: newId,
    name,
    email,
    role: role || 'student'
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT /users/:id - Update existing user
app.put('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      error: 'User Not Found',
      message: `No user exists with ID: ${req.params.id}`
    });
  }

  const { name, email, role } = req.body;
  users[index] = {
    ...users[index],
    name: name !== undefined ? name : users[index].name,
    email: email !== undefined ? email : users[index].email,
    role: role !== undefined ? role : users[index].role
  };

  res.status(200).json(users[index]);
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({
      error: 'User Not Found',
      message: `No user exists with ID: ${req.params.id}`
    });
  }

  const deletedUser = users.splice(index, 1)[0];
  res.status(200).json({
    message: `User with ID ${req.params.id} successfully deleted.`,
    user: deletedUser
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`🚀 User Service running on port ${PORT}`);
  console.log(`========================================`);
});
