# Framework Benchmark Suite (C++ WRK Implementation)

A high-performance benchmarking suite using C++ and WRK for comprehensive performance analysis of web frameworks across Node.js and Bun runtimes.

## 🚀 Overview

This benchmark suite is implemented in C++ for maximum performance and accuracy, using the industry-standard WRK load testing tool to evaluate Express, Fastify, and Hono frameworks across both Node.js and Bun runtime environments.

### 🔧 Technical Stack

- **Language**: C++17 with modern standards
- **Load Testing**: WRK (HTTP benchmarking tool)
- **Build System**: Make with cross-platform support
- **Frameworks**: Express, Fastify, Hono
- **Runtimes**: Node.js, Bun
- **Output**: JSON and CSV formats

## 📊 Latest Benchmark Results

*Results are automatically updated monthly via GitHub Actions*

### 🏆 Performance Rankings

| Rank | Framework & Runtime | Requests/sec | Avg Latency | P90 Latency | P99 Latency | Throughput |
|------|-------------------|--------------|-------------|-------------|-------------|------------|
| 1    | TBD              | TBD          | TBD         | TBD         | TBD         | TBD        |
| 2    | TBD              | TBD          | TBD         | TBD         | TBD         | TBD        |
| 3    | TBD              | TBD          | TBD         | TBD         | TBD         | TBD        |

*Run `make run` to generate latest results*

## 🏃‍♂️ Quick Start

### Prerequisites

**macOS (via Homebrew):**
```bash
# Install dependencies
brew install curl wrk pkg-config

# Verify installation
wrk --version
g++ --version
```

**Ubuntu/Debian:**
```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y build-essential libcurl4-openssl-dev pkg-config

# Install WRK
git clone https://github.com/wg/wrk.git /tmp/wrk
cd /tmp/wrk && make && sudo cp wrk /usr/local/bin/
rm -rf /tmp/wrk

# Verify installation
wrk --version
g++ --version
```

### Build and Run

```bash
# Clone repository
git clone <repository-url>
cd framework-benchmark

# Install framework dependencies
npm install
bun install

# Check dependencies
make check-deps

# Build C++ benchmark
make

# Run benchmark suite
make run
```

## 🔨 Build System

### Makefile Targets

```bash
# Core targets
make              # Build the benchmark (default)
make run          # Build and run benchmark
make clean        # Clean build artifacts
make clean-all    # Clean all generated files

# Build variants
make debug        # Build with debug symbols
make release      # Build optimized release version

# Dependency management
make install-deps      # Install system dependencies (macOS)
make install-deps-ubuntu # Install system dependencies (Ubuntu)
make check-deps        # Verify all dependencies

# Development
make test-compile # Test compilation without running
make help         # Show all available targets
```

### npm Script Integration

```bash
# Build commands
npm run build          # Standard build
npm run build:debug    # Debug build
npm run build:release  # Optimized build

# Run commands
npm run benchmark      # Run benchmark suite
npm run benchmark:wrk  # Alias for benchmark

# Utility commands
npm run deps:install   # Install system dependencies
npm run deps:check     # Check dependencies
npm run test:compile   # Test compilation
npm run clean          # Clean all artifacts
```

## ⚙️ Configuration

The benchmark is configured in `benchmark_wrk.cpp`:

```cpp
const BENCHMARK_CONFIG = {
    connections: 100,     // Concurrent connections
    threads: 12,          // Worker threads
    duration: "30s",      // Test duration per run
    timeout: "10s",       // Request timeout
    runs: 3,              // Number of runs per framework
    warmupTime: 3000,     // Server warmup time (ms)
    cooldownTime: 2000,   // Cooldown between tests (ms)
    latencyStats: true    // Enable detailed latency percentiles
};
```

### Framework Configurations

| Framework | Port | Runtime Support | Response Type |
|-----------|------|----------------|---------------|
| Express   | 3000 | Node.js, Bun   | JSON          |
| Fastify   | 3001 | Node.js, Bun   | JSON          |
| Hono      | 3002 | Node.js, Bun   | JSON          |

## 📈 Metrics Collected

### Performance Metrics
- **Requests per Second (RPS)**: Primary performance indicator
- **Latency Statistics**: Average, P50, P75, P90, P99 percentiles
- **Throughput**: Data transfer rate (MB/s)
- **Total Requests**: Aggregate request count across all runs

### Reliability Metrics
- **Error Rate**: HTTP errors and connection failures
- **Timeout Count**: Request timeouts
- **Socket Errors**: Connection-level failures
- **Standard Deviation**: Statistical variance across runs

## 📁 Output Files

### JSON Results (`benchmark_results_wrk.json`)
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "benchmarkTool": "wrk",
  "environment": {
    "nodeVersion": "v20.0.0",
    "bunVersion": "1.0.0",
    "wrkVersion": "4.2.0",
    "platform": "darwin",
    "cpus": 8
  },
  "results": [
    {
      "environment": "Express on Node.js",
      "runtime": "node",
      "framework": "express",
      "requestsPerSecond": 12000.50,
      "avgLatency": 8.33,
      "p90Latency": 15.20,
      "p99Latency": 25.10,
      "throughput": 2048000,
      "errors": 0
    }
  ]
}
```

### CSV Results (`benchmark_results_wrk.csv`)
Spreadsheet-compatible format for analysis and visualization.

## 🔍 Framework Implementations

### Express Server (`express_server.js`)
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!', timestamp: Date.now() });
});

app.listen(3000, () => console.log('Express server running on port 3000'));
```

### Fastify Server (`fastify_server.js`)
```javascript
const fastify = require('fastify')({ logger: false });

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!', timestamp: Date.now() };
});

fastify.listen({ port: 3001, host: '0.0.0.0' });
```

### Hono Server (`hono_server.js`)
```javascript
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!', timestamp: Date.now() });
});

serve({ fetch: app.fetch, port: 3002 });
```

## 🤖 CI/CD Integration

### GitHub Actions Workflows

**Monthly Benchmarks** (`.github/workflows/monthly-benchmark.yml`)
- Runs automatically on the 1st of each month
- Tests across multiple Node.js versions
- Updates repository with latest results
- Generates performance trend data

**PR Benchmarks** (`.github/workflows/pr-benchmark.yml`)
- Validates performance impact of changes
- Runs optimized tests for faster CI execution
- Comments results directly on pull requests
- Compares against baseline performance

**Setup Validation** (`.github/workflows/test-setup.yml`)
- Tests compilation across Ubuntu and macOS
- Validates all framework servers
- Ensures WRK integration works correctly
- Runs performance smoke tests

### Manual Workflow Triggers
```bash
# Trigger monthly benchmark manually
gh workflow run monthly-benchmark.yml

# Trigger PR benchmark for specific PR
gh workflow run pr-benchmark.yml -f pr_number=123
```

## 🛠️ Development

### Adding New Frameworks

1. **Create server file**: `newframework_server.js`
2. **Add to configuration** in `benchmark_wrk.cpp`:
```cpp
setups.push_back({
    "NewFramework on Node.js", 
    3003, 
    "node", 
    "newframework", 
    "newframework_server.js"
});
```
3. **Update port allocation** and documentation

### Modifying Benchmark Parameters

Edit the configuration struct in `benchmark_wrk.cpp`:
```cpp
const BENCHMARK_CONFIG = {
    connections: 200,     // Increase load
    duration: "60s",      // Longer tests
    runs: 5,              // More runs for accuracy
    // ... other parameters
};
```

### Custom Build Configurations

```bash
# Custom compiler flags
make CXXFLAGS="-O3 -march=native"

# Debug build with specific flags
make debug CXXFLAGS="-g -fsanitize=address"

# Cross-compilation
make CXX=clang++
```

## 📊 Performance Analysis

### Interpreting Results

**Requests per Second (RPS)**
- Primary metric for throughput comparison
- Higher values indicate better performance
- Consider alongside latency metrics

**Latency Percentiles**
- P50 (median): Typical user experience
- P90: Experience of slower 10% of requests
- P99: Worst-case scenarios (important for SLA)

**Throughput vs. Latency Trade-offs**
- High RPS with low latency = optimal
- High RPS with high latency = potential overload
- Consider both metrics for complete picture

### Statistical Significance

- Multiple runs provide statistical confidence
- Standard deviation indicates result consistency
- Large deviations may indicate system variance

## 🔧 Troubleshooting

### Common Issues

**Compilation Errors**
```bash
# Check dependencies
make check-deps

# Verify compiler version
g++ --version  # Requires GCC 7+ or Clang 5+

# Clean and rebuild
make clean && make
```

**WRK Installation Issues**
```bash
# macOS
brew install wrk

# Ubuntu - manual build
git clone https://github.com/wg/wrk.git
cd wrk && make && sudo cp wrk /usr/local/bin/
```

**Server Startup Failures**
```bash
# Test individual servers
node express_server.js &
curl http://localhost:3000

# Check port availability
lsof -i :3000
```

**Permission Issues**
```bash
# Linux - ensure user can bind to ports
# Run with sudo if needed, or use ports > 1024
```

### Performance Issues

**Low Performance Results**
- Check system load during benchmarking
- Ensure no other services using test ports
- Verify adequate system resources (CPU, memory)
- Consider reducing concurrent connections for smaller systems

**Inconsistent Results**
- Multiple runs help identify variance
- Check for background processes affecting performance
- Ensure stable network conditions
- Consider longer warmup times

## 📚 Technical References

### WRK Documentation
- [WRK GitHub Repository](https://github.com/wg/wrk)
- [WRK Usage Examples](https://github.com/wg/wrk/wiki)

### Framework Documentation
- [Express.js](https://expressjs.com/)
- [Fastify](https://www.fastify.io/)
- [Hono](https://hono.dev/)

### Runtime Documentation
- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/)

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/improvement`
3. **Test changes**: `make clean && make && make run`
4. **Update documentation** if needed
5. **Submit pull request** with performance validation

### Code Style
- Follow C++17 standards
- Use meaningful variable names
- Include error handling
- Document complex algorithms
- Maintain cross-platform compatibility

## 📄 License

[Specify your license here]

## 🔗 Links

- **Repository**: [GitHub Repository URL]
- **Issues**: [Issues URL]
- **Discussions**: [Discussions URL]
- **Latest Results**: [Results URL]

---

**Built with ⚡ by the performance engineering team**

*Last updated: [Auto-generated timestamp]*