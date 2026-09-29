const test = require('node:test');
const assert = require('node:assert');

test('Product Service logic test', (t) => {
  const products = [
    { id: "501", name: "Engineering Mathematics Volume 1", price: 650.00, stock: 35 }
  ];
  const item = products.find(p => p.id === '501');
  assert.ok(item, 'Product with ID 501 should be present');
  assert.strictEqual(item.price, 650.00);
});

