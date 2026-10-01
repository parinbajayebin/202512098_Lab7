// metrics.js - Prometheus Metrics Instrumentation for API Gateway & Services
// Fully compliant with Prometheus exposition format (text/plain; version=0.0.4)

let promClient = null;
try {
  promClient = require('prom-client');
} catch (e) {
  // prom-client not installed locally, fallback to built-in exporter
}

// Built-in metrics storage if prom-client is not present
const requestCounts = new Map(); // key: `${method}|${route}|${status}` -> count
const durationBuckets = [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5];
const durationStats = new Map(); // key: `${method}|${route}` -> { buckets: [], sum: 0, count: 0 }
const startTime = Date.now();

// If prom-client is available, configure it
let promRegister, httpRequestDurationMicroseconds, httpRequestsTotal;
if (promClient) {
  promRegister = new promClient.Registry();
  promClient.collectDefaultMetrics({ register: promRegister, prefix: 'nodejs_' });

  httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status'],
    registers: [promRegister]
  });

  httpRequestDurationMicroseconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: durationBuckets,
    registers: [promRegister]
  });
}

// Express Middleware to measure request duration and count
function metricsMiddleware(req, res, next) {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const durationSeconds = elapsedHrTime[0] + elapsedHrTime[1] / 1e9;
    const status = res.statusCode.toString();
    const method = req.method;

    // Normalize route to avoid high cardinality (e.g., /users/101 -> /users/:id)
    let route = req.baseUrl || req.path || '/';
    if (route.startsWith('/users/')) route = '/users/:id';
    else if (route.startsWith('/products/')) route = '/products/:id';
    else if (route.startsWith('/orders/')) route = '/orders/:id';

    // Update prom-client if available
    if (promClient) {
      httpRequestsTotal.inc({ method, route, status });
      httpRequestDurationMicroseconds.observe({ method, route, status }, durationSeconds);
    }

    // Always update built-in metrics
    const countKey = `${method}|${route}|${status}`;
    requestCounts.set(countKey, (requestCounts.get(countKey) || 0) + 1);

    const durKey = `${method}|${route}`;
    let stats = durationStats.get(durKey);
    if (!stats) {
      stats = { buckets: new Array(durationBuckets.length).fill(0), sum: 0, count: 0 };
      durationStats.set(durKey, stats);
    }
    stats.count += 1;
    stats.sum += durationSeconds;
    for (let i = 0; i < durationBuckets.length; i++) {
      if (durationSeconds <= durationBuckets[i]) {
        stats.buckets[i] += 1;
      }
    }
  });

  next();
}

// Format built-in metrics in Prometheus standard text exposition format
function getBuiltinMetrics() {
  const mem = process.memoryUsage();
  const uptimeSeconds = (Date.now() - startTime) / 1000;
  const lines = [];

  // Uptime & Process Metrics
  lines.push('# HELP process_uptime_seconds The time the process has been running in seconds.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${uptimeSeconds.toFixed(2)}`);

  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes.');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${mem.rss}`);

  lines.push('# HELP nodejs_heap_size_used_bytes Process heap memory used.');
  lines.push('# TYPE nodejs_heap_size_used_bytes gauge');
  lines.push(`nodejs_heap_size_used_bytes ${mem.heapUsed}`);

  lines.push('# HELP nodejs_heap_size_total_bytes Process heap memory allocated.');
  lines.push('# TYPE nodejs_heap_size_total_bytes gauge');
  lines.push(`nodejs_heap_size_total_bytes ${mem.heapTotal}`);

  // HTTP Requests Total Counter
  lines.push('# HELP http_requests_total Total number of HTTP requests processed');
  lines.push('# TYPE http_requests_total counter');
  if (requestCounts.size === 0) {
    lines.push('http_requests_total{method="GET",route="/health",status="200"} 0');
  } else {
    for (const [key, count] of requestCounts.entries()) {
      const [method, route, status] = key.split('|');
      lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
  }

  // HTTP Request Duration Histogram
  lines.push('# HELP http_request_duration_seconds Duration of HTTP requests in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');
  for (const [key, stats] of durationStats.entries()) {
    const [method, route] = key.split('|');
    let cum = 0;
    for (let i = 0; i < durationBuckets.length; i++) {
      cum += stats.buckets[i];
      lines.push(`http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${durationBuckets[i]}"} ${cum}`);
    }
    lines.push(`http_request_duration_seconds_bucket{method="${method}",route="${route}",le="+Inf"} ${stats.count}`);
    lines.push(`http_request_duration_seconds_sum{method="${method}",route="${route}"} ${stats.sum.toFixed(6)}`);
    lines.push(`http_request_duration_seconds_count{method="${method}",route="${route}"} ${stats.count}`);
  }

  return lines.join('\n') + '\n';
}

// Handler for /metrics endpoint
async function metricsEndpoint(req, res) {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  if (promClient && promRegister) {
    try {
      const metrics = await promRegister.metrics();
      return res.send(metrics);
    } catch (err) {
      console.error('Error generating prom-client metrics, falling back:', err);
    }
  }
  res.send(getBuiltinMetrics());
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint
};

