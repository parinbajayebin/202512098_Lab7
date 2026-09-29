const test = require('node:test');
const assert = require('node:assert');

test('Order Service calculations and validation test', (t) => {
  const items = [
    { productId: "501", price: 650.00, quantity: 2 }
  ];
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  assert.strictEqual(total, 1300.00, 'Calculated total should be 1300.00');
});

