const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

test('API Gateway Environment & Metric Exporter Unit Check', (t) => {
  const { metricsEndpoint } = require('../metrics');
  assert.strictEqual(typeof metricsEndpoint, 'function', 'metricsEndpoint must be a function');
});

test('API Gateway Service Registry Config Check', (t) => {
  const defaultUserUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001';
  assert.ok(defaultUserUrl.includes('3001'), 'User service URL default port is 3001');
});

