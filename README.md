# Node.js Framework Benchmark

Performance comparison of Express.js, Fastify, and Hono across Node.js and Bun runtimes

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)
![Benchmark](https://img.shields.io/badge/Benchmark-Automated-blue?style=flat)
![Last Updated](https://img.shields.io/badge/Last%20Updated-2025-07-17-green?style=flat)

## 📊 Quick Results

**🏆 Performance Leader:** Fastify on bun - **84,845.87 req/sec**

**⚡ Biggest Runtime Improvement:** Express (+15.6% with Bun)

**🕐 Last Updated:** July 17, 2025 at 07:24 AM UTC

---

## 📑 Table of Contents

- [📊 Quick Results](#-quick-results)
- [🏆 Performance Rankings](#-performance-rankings)
- [📈 Detailed Results](#-detailed-results)
- [⚡ Runtime Comparisons](#-runtime-comparisons)
- [🔬 Methodology](#-methodology)
- [🖥️ Test Environment](#️-test-environment)
- [🚀 Running the Benchmarks](#-running-the-benchmarks)
- [📝 Server Implementations](#-server-implementations)
- [📊 Historical Data](#-historical-data)
- [🤝 Contributing](#-contributing)

---

## 🏆 Performance Rankings

### Requests per Second (Higher is Better)

| Rank | Framework + Runtime | Requests/sec | Std Dev | Performance Score |
|------|---------------------|--------------|---------|-------------------|
| 🥇 1 | **Fastify on bun** | 84,845.87 | ±1,544.76 | 100.0% |
| 🥈 2 | **Fastify on node** | 75,792.80 | ±3,473.46 | 89.3% |
| 🥉 3 | **Express on bun** | 75,236.67 | ±13,377.25 | 88.7% |
|    4 | **Hono on bun** | 68,095.03 | ±1,329.51 | 80.3% |
|    5 | **Hono on node** | 67,381.34 | ±475.24 | 79.4% |
|    6 | **Express on node** | 65,101.34 | ±69.88 | 76.7% |

### Latency Rankings (Lower is Better)

| Rank | Framework + Runtime | Avg Latency | P95 Latency | P99 Latency |
|------|---------------------|-------------|-------------|-------------|
| 🚀 1 | **Fastify on bun** | 0.77ms | 0.00ms | 2.33ms |
| ⚡ 2 | **Fastify on node** | 0.91ms | 0.00ms | 2.33ms |
| 💨 3 | **Express on bun** | 0.91ms | 0.00ms | 3.00ms |
|    4 | **Hono on bun** | 1.01ms | 0.00ms | 3.00ms |
|    5 | **Express on node** | 1.03ms | 0.00ms | 2.00ms |
|    6 | **Hono on node** | 1.04ms | 0.00ms | 2.00ms |

---

## 📈 Detailed Results

### Complete Performance Metrics

| Framework | Runtime | Req/sec | Latency (avg) | Latency (p95) | Throughput | Success Rate | Total Requests |
|-----------|---------|---------|---------------|---------------|------------|--------------|----------------|
| **Fastify** | bun | 84,845.87 | 0.77ms | 0.00ms | 12.6 MB/s | 100.0% | 7,635,904 |
| **Fastify** | node | 75,792.80 | 0.91ms | 0.00ms | 14.7 MB/s | 100.0% | 6,821,351 |
| **Express** | bun | 75,236.67 | 0.91ms | 0.00ms | 14.4 MB/s | 100.0% | 6,771,194 |
| **Hono** | bun | 68,095.03 | 1.01ms | 0.00ms | 9.0 MB/s | 100.0% | 6,128,652 |
| **Hono** | node | 67,381.34 | 1.04ms | 0.00ms | 11.9 MB/s | 100.0% | 6,064,351 |
| **Express** | node | 65,101.34 | 1.03ms | 0.00ms | 15.3 MB/s | 100.0% | 5,858,930 |

### 🎯 Key Performance Insights

- **Highest Throughput:** Fastify on bun with 84,845.87 requests/second
- **Lowest Latency:** Fastify on bun with 0.77ms average response time
- **Most Consistent Framework:** Hono (lowest std deviation: ±902.37)


---

## ⚡ Runtime Comparisons

### Node.js vs Bun Performance Impact

| Framework | Node.js (req/sec) | Bun (req/sec) | Improvement | Latency Impact |
|-----------|-------------------|---------------|-------------|----------------|
| **Fastify** | 75,792.80 | 84,845.87 | +11.9% 🚀 | -14.7% ⚡ |
| **Express** | 65,101.34 | 75,236.67 | +15.6% 🚀 | -11.3% ⚡ |
| **Hono** | 67,381.34 | 68,095.03 | +1.1% 🚀 | -2.9% ⚡ |

### 🔍 Runtime Analysis

**Best Bun Performance Gains:**
🥇 Express: +15.6% performance increase
🥈 Fastify: +11.9% performance increase
🥉 Hono: +1.1% performance increase

**Average Bun Improvement:** +9.5% across all frameworks


---

## 🔬 Methodology

### Test Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Connections** | 100 | Concurrent connections during test |
| **Duration** | 30 seconds | Test duration per framework |
| **Pipelining** | 1 | HTTP pipelining level |
| **Runs** | 3 | Number of test iterations per setup |
| **Warmup Time** | 3000ms | Server warmup before testing |
| **Cooldown Time** | 2000ms | Pause between tests |

### 📋 Testing Process

1. **Server Startup**: Each framework server is started with production environment settings
2. **Health Check**: Verify server is responding before benchmark starts
3. **Warmup Period**: 3 second delay to ensure server is ready
4. **Load Testing**: 3 independent test runs using [Autocannon](https://github.com/mcollina/autocannon)
5. **Statistical Analysis**: Results averaged across all runs with standard deviation calculation
6. **Cleanup**: Server shutdown and cooldown period between tests

### 📊 Metrics Collected

- **Requests per Second (RPS)**: Average throughput across all test runs
- **Latency Distribution**: Average, P50, P90, P95, and P99 response times
- **Throughput**: Data transfer rate in bytes per second
- **Error Rates**: Failed requests, timeouts, and non-2xx responses
- **Success Rate**: Percentage of successful requests

### 🎯 Test Endpoints

Each framework implements a simple endpoint optimized for their respective patterns:

- **Express**: Plain text response for minimal overhead
- **Fastify**: JSON response showcasing built-in serialization
- **Hono**: JSON response demonstrating modern framework capabilities

---

## 🖥️ Test Environment

### System Specifications

| Component | Details |
|-----------|---------|
| **Operating System** | darwin arm64 |
| **CPU** | Apple M3 (8 cores) |
| **Memory** | 16GB total, 1GB available |
| **Hostname** | PriM31415 |
| **Node.js Version** | v24.3.0 |
| **Bun Version** | 1.2.18 |

### 🕐 Test Execution

- **Timestamp**: July 17, 2025 at 07:24 AM UTC
- **Total Test Duration**: ~4 minutes
- **Successful Tests**: 6/6

---

## 🚀 Running the Benchmarks

### Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Bun dependencies
bun install
```

### Quick Start

```bash
# Run complete benchmark suite
npm run benchmark:full

# Run enhanced benchmark with detailed reporting
node scripts/benchmark.js

# Generate updated README
node scripts/generate-readme.js
```

### Individual Framework Testing

```bash
# Express servers
npm run express:node    # Express on Node.js
npm run express:bun     # Express on Bun

# Fastify servers
npm run fastify:node    # Fastify on Node.js
npm run fastify:bun     # Fastify on Bun

# Hono servers
npm run hono:node       # Hono on Node.js
npm run hono:bun        # Hono on Bun
```

### Custom Benchmark Configuration

You can modify the benchmark parameters in `scripts/benchmark.js`:

```javascript
const config = {
  connections: 100,     // Concurrent connections
  duration: 30,         // Test duration in seconds
  runs: 3,             // Number of test iterations
  warmupTime: 3000,    // Server warmup time (ms)
  cooldownTime: 2000   // Cooldown between tests (ms)
};
```

---

## 📝 Server Implementations

### Express.js Server

```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.listen(3000, () => {
  console.log('Express server running on port 3000');
});
```

### Fastify Server

```javascript
const fastify = require('fastify')({ logger: false });

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

const start = async () => {
  await fastify.listen({ port: 3001 });
  console.log('Fastify server running on port 3001');
};
start();
```

### Hono Server

```javascript
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

serve(app, { port: 3002 }, (info) => {
  console.log(`Hono server running on port ${info.port}`);
});
```

### 🔧 Implementation Notes

- **Express**: Uses plain text response for minimal serialization overhead
- **Fastify**: Leverages built-in JSON serialization for optimal performance
- **Hono**: Showcases modern framework design with clean API patterns
- **Production Mode**: All servers run with `NODE_ENV=production` for realistic performance
- **Minimal Middleware**: No additional middleware or logging to focus on core framework performance

---

## 📊 Historical Data

This benchmark is automatically updated monthly to track performance trends across framework and runtime updates.

### 📈 Performance Trends

*Historical trend data will be available after multiple benchmark runs*

### 🔄 Automated Updates

- **Frequency**: Monthly on the 1st of each month
- **GitHub Action**: Automatically runs benchmarks and updates this README
- **Data Retention**: Previous results archived in `data/historical/` directory

---

## 🤝 Contributing

### Adding New Frameworks

1. Create a new server file (e.g., `newframework_server.js`)
2. Add framework configuration to `scripts/benchmark.js`
3. Update package.json with new dependencies and scripts
4. Submit a pull request with your changes

### Improving Benchmarks

- **Methodology improvements**: Enhance testing procedures
- **Additional metrics**: Add new performance measurements
- **Platform support**: Test on different operating systems
- **Documentation**: Improve explanations and analysis

### 📋 Guidelines

- Ensure fair testing across all frameworks
- Use production-optimized configurations
- Provide clear documentation for new features
- Follow existing code style and patterns

---

## 📄 License

MIT License - Feel free to use and modify for your own benchmarking needs.

---

*This README was automatically generated on July 17, 2025 at 07:24 AM UTC by the [Framework Benchmark Suite](https://github.com/your-repo/framework-benchmark).*

**⭐ Found this useful? Star the repository to support continued development!**