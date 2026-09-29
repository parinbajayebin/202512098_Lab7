const test = require('node:test');
const assert = require('node:assert');

test('User Service logic test', (t) => {
  const users = [
    { id: "101", name: "Aarav Sharma", email: "aarav.sharma@campus.edu.in", role: "student" }
  ];
  const user = users.find(u => u.id === '101');
  assert.ok(user, 'User with ID 101 should be present');
  assert.strictEqual(user.name, 'Aarav Sharma');
});

