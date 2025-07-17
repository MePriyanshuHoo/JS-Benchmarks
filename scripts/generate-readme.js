const fs = require("fs");
const path = require("path");

class ReadmeGenerator {
  constructor(resultsPath = "benchmark_results.json") {
    this.resultsPath = resultsPath;
    this.results = null;
    this.template = {
      title: "# Node.js Framework Benchmark",
      subtitle:
        "Performance comparison of Express.js, Fastify, and Hono across Node.js and Bun runtimes",
      badges: [
        "![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)",
        "![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)",
        "![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)",
        "![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)",
        "![Benchmark](https://img.shields.io/badge/Benchmark-Automated-blue?style=flat)",
        "![Last Updated](https://img.shields.io/badge/Last%20Updated-{{DATE}}-green?style=flat)",
      ],
    };
  }

  loadResults() {
    try {
      const data = fs.readFileSync(this.resultsPath, "utf8");
      this.results = JSON.parse(data);
      return true;
    } catch (error) {
      console.error("❌ Failed to load benchmark results:", error.message);
      return false;
    }
  }

  formatDate(isoString) {
    const date = new Date(isoString);
    return (
      date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    );
  }

  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) {
      return "0.00";
    }
    return num.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  formatBytes(bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes)) {
      return "0.0 MB/s";
    }
    const mb = bytes / 1024 / 1024;
    return `${this.formatNumber(mb, 1)} MB/s`;
  }

  formatPercentage(decimal) {
    if (decimal === null || decimal === undefined || isNaN(decimal)) {
      return "0.0%";
    }
    return `${(decimal * 100).toFixed(1)}%`;
  }

  generateHeader() {
    const lastUpdated = new Date(this.results.metadata.timestamp)
      .toISOString()
      .split("T")[0];
    const badges = this.template.badges
      .map((badge) => badge.replace("{{DATE}}", lastUpdated))
      .join("\n");

    return `${this.template.title}

${this.template.subtitle}

${badges}

## 📊 Quick Results

**🏆 Performance Leader:** ${this.results.rankings.byRequestsPerSecond[0].name} - **${this.formatNumber(this.results.rankings.byRequestsPerSecond[0].value)} req/sec**

**⚡ Biggest Runtime Improvement:** ${this.getBiggestImprovement()}

**🕐 Last Updated:** ${this.formatDate(this.results.metadata.timestamp)}

---`;
  }

  getBiggestImprovement() {
    const comparisons = this.results.comparisons;
    if (!comparisons || Object.keys(comparisons).length === 0) {
      return "No runtime comparisons available";
    }

    let biggest = { framework: "", improvement: 0 };

    Object.keys(comparisons).forEach((framework) => {
      const improvement = comparisons[framework]?.improvement?.percentage || 0;
      if (improvement > biggest.improvement) {
        biggest = { framework, improvement };
      }
    });

    if (biggest.framework === "") {
      return "No significant improvements detected";
    }

    return `${biggest.framework} (+${biggest.improvement.toFixed(1)}% with Bun)`;
  }

  generateTableOfContents() {
    return `## 📑 Table of Contents

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

---`;
  }

  generatePerformanceRankings() {
    const rankings = this.results.rankings.byRequestsPerSecond;

    let section = `## 🏆 Performance Rankings

### Requests per Second (Higher is Better)

| Rank | Framework + Runtime | Requests/sec | Std Dev | Performance Score |
|------|---------------------|--------------|---------|-------------------|`;

    rankings.forEach((rank, index) => {
      const emoji =
        index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
      const score = ((rank.value / rankings[0].value) * 100).toFixed(1);
      section += `\n| ${emoji} ${rank.rank} | **${rank.name}** | ${this.formatNumber(rank.value)} | ±${this.formatNumber(rank.stdDev)} | ${score}% |`;
    });

    section += "\n\n### Latency Rankings (Lower is Better)\n\n";
    section +=
      "| Rank | Framework + Runtime | Avg Latency | P95 Latency | P99 Latency |\n";
    section +=
      "|------|---------------------|-------------|-------------|-------------|";

    this.results.rankings.byLatency.forEach((rank, index) => {
      const result = this.results.results.find(
        (r) => `${r.framework} on ${r.runtime}` === rank.name,
      );
      const emoji =
        index === 0 ? "🚀" : index === 1 ? "⚡" : index === 2 ? "💨" : "  ";
      const p95 = result?.latency?.p95 || 0;
      const p99 = result?.latency?.p99 || 0;
      section += `\n| ${emoji} ${rank.rank} | **${rank.name}** | ${this.formatNumber(rank.value, 2)}ms | ${this.formatNumber(p95, 2)}ms | ${this.formatNumber(p99, 2)}ms |`;
    });

    return section + "\n\n---";
  }

  generateDetailedResults() {
    let section = `## 📈 Detailed Results

### Complete Performance Metrics

| Framework | Runtime | Req/sec | Latency (avg) | Latency (p95) | Throughput | Success Rate | Total Requests |
|-----------|---------|---------|---------------|---------------|------------|--------------|----------------|`;

    this.results.results.forEach((result) => {
      const errorRate = result.errorRate || 0;
      const successRate = this.formatPercentage(1 - errorRate);
      const p95 = result.latency?.p95 || 0;
      const totalRequests = result.totalRequests || 0;
      section += `\n| **${result.framework}** | ${result.runtime} | ${this.formatNumber(result.requestsPerSecond)} | ${this.formatNumber(result.latency.average, 2)}ms | ${this.formatNumber(p95, 2)}ms | ${this.formatBytes(result.throughput)} | ${successRate} | ${this.formatNumber(totalRequests, 0)} |`;
    });

    // Add performance insights
    section += "\n\n### 🎯 Key Performance Insights\n\n";

    const topPerformer = this.results.rankings.byRequestsPerSecond[0];
    const fastestLatency = this.results.rankings.byLatency[0];

    section += `- **Highest Throughput:** ${topPerformer.name} with ${this.formatNumber(topPerformer.value)} requests/second\n`;
    section += `- **Lowest Latency:** ${fastestLatency.name} with ${this.formatNumber(fastestLatency.value, 2)}ms average response time\n`;

    // Calculate framework averages
    const frameworkStats = this.calculateFrameworkAverages();
    section += `- **Most Consistent Framework:** ${frameworkStats.mostConsistent.name} (lowest std deviation: ±${this.formatNumber(frameworkStats.mostConsistent.stdDev)})\n`;

    return section + "\n\n---";
  }

  calculateFrameworkAverages() {
    const frameworks = {};

    this.results.results.forEach((result) => {
      if (!frameworks[result.framework]) {
        frameworks[result.framework] = { values: [], stdDevs: [] };
      }
      frameworks[result.framework].values.push(result.requestsPerSecond);
      frameworks[result.framework].stdDevs.push(result.stdRps);
    });

    let mostConsistent = { name: "", stdDev: Infinity };

    Object.keys(frameworks).forEach((framework) => {
      const avgStdDev =
        frameworks[framework].stdDevs.reduce((a, b) => a + b, 0) /
        frameworks[framework].stdDevs.length;
      if (avgStdDev < mostConsistent.stdDev) {
        mostConsistent = { name: framework, stdDev: avgStdDev };
      }
    });

    return { mostConsistent };
  }

  generateRuntimeComparisons() {
    let section = `## ⚡ Runtime Comparisons

### Node.js vs Bun Performance Impact

| Framework | Node.js (req/sec) | Bun (req/sec) | Improvement | Latency Impact |
|-----------|-------------------|---------------|-------------|----------------|`;

    Object.keys(this.results.comparisons).forEach((framework) => {
      const comp = this.results.comparisons[framework];
      const improvement = comp.improvement.percentage;
      const improvementText =
        improvement > 0
          ? `+${improvement.toFixed(1)}% 🚀`
          : `${improvement.toFixed(1)}% 📉`;

      const latencyImprovement =
        ((comp.node.latency - comp.bun.latency) / comp.node.latency) * 100;
      const latencyText =
        latencyImprovement > 0
          ? `-${latencyImprovement.toFixed(1)}% ⚡`
          : `+${Math.abs(latencyImprovement).toFixed(1)}% 🐌`;

      section += `\n| **${framework}** | ${this.formatNumber(comp.node.requestsPerSecond)} | ${this.formatNumber(comp.bun.requestsPerSecond)} | ${improvementText} | ${latencyText} |`;
    });

    // Add runtime analysis
    section += "\n\n### 🔍 Runtime Analysis\n\n";

    const improvements = Object.keys(this.results.comparisons)
      .map((framework) => ({
        framework,
        improvement: this.results.comparisons[framework].improvement.percentage,
      }))
      .sort((a, b) => b.improvement - a.improvement);

    section += `**Best Bun Performance Gains:**\n`;
    improvements.forEach((item, index) => {
      const emoji = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
      section += `${emoji} ${item.framework}: +${item.improvement.toFixed(1)}% performance increase\n`;
    });

    const avgImprovement =
      improvements.reduce((sum, item) => sum + item.improvement, 0) /
      improvements.length;
    section += `\n**Average Bun Improvement:** +${avgImprovement.toFixed(1)}% across all frameworks\n`;

    return section + "\n\n---";
  }

  generateMethodology() {
    const config = this.results.configuration;

    return `## 🔬 Methodology

### Test Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Connections** | ${config.connections} | Concurrent connections during test |
| **Duration** | ${config.duration} seconds | Test duration per framework |
| **Pipelining** | ${config.pipelining} | HTTP pipelining level |
| **Runs** | ${config.runs} | Number of test iterations per setup |
| **Warmup Time** | ${config.warmupTime}ms | Server warmup before testing |
| **Cooldown Time** | ${config.cooldownTime}ms | Pause between tests |

### 📋 Testing Process

1. **Server Startup**: Each framework server is started with production environment settings
2. **Health Check**: Verify server is responding before benchmark starts
3. **Warmup Period**: ${config.warmupTime / 1000} second delay to ensure server is ready
4. **Load Testing**: ${config.runs} independent test runs using [Autocannon](https://github.com/mcollina/autocannon)
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

---`;
  }

  generateEnvironment() {
    const env = this.results.environment;

    return `## 🖥️ Test Environment

### System Specifications

| Component | Details |
|-----------|---------|
| **Operating System** | ${env.platform} ${env.arch} |
| **CPU** | ${env.cpuModel || "Unknown"} (${env.cpus} cores) |
| **Memory** | ${env.totalMemory}GB total, ${env.freeMemory}GB available |
| **Hostname** | ${env.hostname} |
| **Node.js Version** | ${env.nodeVersion} |
| **Bun Version** | ${env.bunVersion} |

### 🕐 Test Execution

- **Timestamp**: ${this.formatDate(env.timestamp)}
- **Total Test Duration**: ~${Math.ceil((this.results.summary.totalTests * (this.results.configuration.duration + (this.results.configuration.warmupTime + this.results.configuration.cooldownTime) / 1000)) / 60)} minutes
- **Successful Tests**: ${this.results.summary.successfulTests}/${this.results.summary.totalTests}

---`;
  }

  generateRunningInstructions() {
    return `## 🚀 Running the Benchmarks

### Prerequisites

\`\`\`bash
# Install Node.js dependencies
npm install

# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install Bun dependencies
bun install
\`\`\`

### Quick Start

\`\`\`bash
# Run complete benchmark suite
npm run benchmark:full

# Run enhanced benchmark with detailed reporting
node scripts/benchmark.js

# Generate updated README
node scripts/generate-readme.js
\`\`\`

### Individual Framework Testing

\`\`\`bash
# Express servers
npm run express:node    # Express on Node.js
npm run express:bun     # Express on Bun

# Fastify servers
npm run fastify:node    # Fastify on Node.js
npm run fastify:bun     # Fastify on Bun

# Hono servers
npm run hono:node       # Hono on Node.js
npm run hono:bun        # Hono on Bun
\`\`\`

### Custom Benchmark Configuration

You can modify the benchmark parameters in \`scripts/benchmark.js\`:

\`\`\`javascript
const config = {
  connections: 100,     // Concurrent connections
  duration: 30,         // Test duration in seconds
  runs: 3,             // Number of test iterations
  warmupTime: 3000,    // Server warmup time (ms)
  cooldownTime: 2000   // Cooldown between tests (ms)
};
\`\`\`

---`;
  }

  generateServerImplementations() {
    return `## 📝 Server Implementations

### Express.js Server

\`\`\`javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

app.listen(3000, () => {
  console.log('Express server running on port 3000');
});
\`\`\`

### Fastify Server

\`\`\`javascript
const fastify = require('fastify')({ logger: false });

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

const start = async () => {
  await fastify.listen({ port: 3001 });
  console.log('Fastify server running on port 3001');
};
start();
\`\`\`

### Hono Server

\`\`\`javascript
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

serve(app, { port: 3002 }, (info) => {
  console.log(\`Hono server running on port \${info.port}\`);
});
\`\`\`

### 🔧 Implementation Notes

- **Express**: Uses plain text response for minimal serialization overhead
- **Fastify**: Leverages built-in JSON serialization for optimal performance
- **Hono**: Showcases modern framework design with clean API patterns
- **Production Mode**: All servers run with \`NODE_ENV=production\` for realistic performance
- **Minimal Middleware**: No additional middleware or logging to focus on core framework performance

---`;
  }

  generateHistoricalSection() {
    return `## 📊 Historical Data

This benchmark is automatically updated monthly to track performance trends across framework and runtime updates.

### 📈 Performance Trends

*Historical trend data will be available after multiple benchmark runs*

### 🔄 Automated Updates

- **Frequency**: Monthly on the 1st of each month
- **GitHub Action**: Automatically runs benchmarks and updates this README
- **Data Retention**: Previous results archived in \`data/historical/\` directory

---`;
  }

  generateContributing() {
    return `## 🤝 Contributing

### Adding New Frameworks

1. Create a new server file (e.g., \`newframework_server.js\`)
2. Add framework configuration to \`scripts/benchmark.js\`
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

*This README was automatically generated on ${this.formatDate(this.results.metadata.timestamp)} by the [Framework Benchmark Suite](https://github.com/your-repo/framework-benchmark).*

**⭐ Found this useful? Star the repository to support continued development!**`;
  }

  generate() {
    if (!this.loadResults()) {
      return null;
    }

    const sections = [
      this.generateHeader(),
      this.generateTableOfContents(),
      this.generatePerformanceRankings(),
      this.generateDetailedResults(),
      this.generateRuntimeComparisons(),
      this.generateMethodology(),
      this.generateEnvironment(),
      this.generateRunningInstructions(),
      this.generateServerImplementations(),
      this.generateHistoricalSection(),
      this.generateContributing(),
    ];

    return sections.join("\n\n");
  }

  saveReadme(outputPath = "README.md") {
    const content = this.generate();
    if (!content) {
      console.error("❌ Failed to generate README content");
      return false;
    }

    try {
      fs.writeFileSync(outputPath, content);
      console.log(`✅ README generated successfully: ${outputPath}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to write README file:", error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  const resultsPath = process.argv[2] || "benchmark_results.json";
  const outputPath = process.argv[3] || "README.md";

  console.log("📝 Generating README from benchmark results...");
  console.log(`📊 Input: ${resultsPath}`);
  console.log(`📄 Output: ${outputPath}`);

  const generator = new ReadmeGenerator(resultsPath);
  const success = generator.saveReadme(outputPath);

  if (success) {
    console.log("\n🎉 README generation completed successfully!");
    console.log("📋 The README now contains:");
    console.log("   • Performance rankings and detailed metrics");
    console.log("   • Runtime comparison analysis");
    console.log("   • Complete methodology documentation");
    console.log("   • System environment details");
    console.log("   • Setup and usage instructions");
  } else {
    process.exit(1);
  }
}

// Export for use as module
module.exports = { ReadmeGenerator };

// Run if this file is executed directly
if (require.main === module) {
  main();
}
