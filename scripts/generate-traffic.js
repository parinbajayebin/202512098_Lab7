// scripts/generate-traffic.js
// Automated traffic generator for Lab 8 Prometheus & Grafana Monitoring

const targetBaseUrl = process.argv[2] || process.env.GATEWAY_URL || 'http://localhost:8080';
const totalIterations = parseInt(process.argv[3], 10) || 20;

console.log(`====================================================`);
console.log(`🚀 Lab 8 Traffic Generator Started`);
console.log(`🎯 Target API Gateway: ${targetBaseUrl}`);
console.log(`🔁 Iterations:         ${totalIterations}`);
console.log(`====================================================\n`);

async function sendRequest(method, path, body = null) {
  const url = `${targetBaseUrl}${path}`;
  const start = Date.now();
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const duration = Date.now() - start;
    console.log(`[${res.status}] ${method} ${path.padEnd(20)} (${duration}ms)`);
    return { status: res.status, ok: res.ok };
  } catch (err) {
    const duration = Date.now() - start;
    console.error(`[ERR] ${method} ${path.padEnd(20)} (${duration}ms) - ${err.message}`);
    return { status: 'ERROR', ok: false };
  }
}

async function runTraffic() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 1; i <= totalIterations; i++) {
    console.log(`\n--- Batch ${i} / ${totalIterations} ---`);

    // 1. Normal Health Check Traffic
    await sendRequest('GET', '/health');

    // 2. Normal User & Product Listing Traffic
    await sendRequest('GET', '/users');
    await sendRequest('GET', '/products');
    await sendRequest('GET', '/orders');

    // 3. User & Product Specific Queries
    await sendRequest('GET', '/users/101');
    await sendRequest('GET', '/products/501');

    // 4. Controlled Error Traffic (404 Not Found) to demonstrate failure metrics
    if (i % 3 === 0) {
      console.log(`⚠️  Generating controlled failure traffic for Grafana error alert...`);
      await sendRequest('GET', '/users/99999'); // Non-existent user
      await sendRequest('GET', '/products/88888'); // Non-existent product
      await sendRequest('GET', '/unknown-route'); // Route not found on gateway
      errorCount += 3;
    }

    // 5. Create Order Traffic (POST)
    if (i % 2 === 0) {
      await sendRequest('POST', '/orders', {
        userId: "101",
        items: [{ productId: "501", quantity: 1 }]
      });
      successCount += 1;
    }

    successCount += 6;
    await new Promise(r => setTimeout(r, 800)); // 800ms throttle between batches
  }

  console.log(`\n====================================================`);
  console.log(`🏁 Traffic Generation Completed!`);
  console.log(`✅ Successful Requests: ~${successCount}`);
  console.log(`⚠️ Controlled Errors:   ~${errorCount}`);
  console.log(`📊 Check Prometheus & Grafana to view the traffic spikes!`);
  console.log(`====================================================`);
}

runTraffic();

