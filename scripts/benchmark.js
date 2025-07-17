const { spawn } = require("child_process");
const autocannon = require("autocannon");
const fs = require("fs");
const path = require("path");
const os = require("os");

class BenchmarkRunner {
  constructor() {
    this.config = {
      connections: 100,
      duration: 30,
      pipelining: 1,
      warmupTime: 3000,
      cooldownTime: 2000,
      runs: 3,
      timeout: 10000,
      healthCheckTimeout: 1000,
      maxStartupAttempts: 20,
    };

    this.frameworks = [
      {
        name: "Express",
        script: "express_server.js",
        port: 3000,
        endpoint: "/",
        responseType: "text",
      },
      {
        name: "Fastify",
        script: "fastify_server.js",
        port: 3001,
        endpoint: "/",
        responseType: "json",
      },
      {
        name: "Hono",
        script: "hono_server.js",
        port: 3002,
        endpoint: "/",
        responseType: "json",
      },
    ];

    this.runtimes = ["node", "bun"];
    this.results = [];
  }

  async getSystemInfo() {
    const system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
      hostname: os.hostname(),
      timestamp: new Date().toISOString(),
    };

    // Try to get Bun version
    try {
      const bunVersion = require("child_process")
        .execSync("bun --version", {
          encoding: "utf8",
          timeout: 5000,
        })
        .trim();
      system.bunVersion = bunVersion;
    } catch (error) {
      system.bunVersion = "not available";
    }

    // Try to get additional system info
    try {
      if (process.platform === "darwin") {
        const cpuModel = require("child_process")
          .execSync("sysctl -n machdep.cpu.brand_string", {
            encoding: "utf8",
            timeout: 5000,
          })
          .trim();
        system.cpuModel = cpuModel;
      } else if (process.platform === "linux") {
        const cpuModel = require("child_process")
          .execSync(
            'cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2',
            {
              encoding: "utf8",
              timeout: 5000,
            },
          )
          .trim();
        system.cpuModel = cpuModel;
      }
    } catch (error) {
      system.cpuModel = "unknown";
    }

    return system;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async checkServerHealth(port) {
    return new Promise((resolve) => {
      const http = require("http");
      const req = http.request(`http://localhost:${port}`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(this.config.healthCheckTimeout);
      req.end();
    });
  }

  async waitForServer(port, maxAttempts = null) {
    const attempts = maxAttempts || this.config.maxStartupAttempts;
    for (let i = 0; i < attempts; i++) {
      if (await this.checkServerHealth(port)) {
        return true;
      }
      await this.sleep(500);
    }
    return false;
  }

  async runSingleBenchmark(framework, runtime) {
    const testName = `${framework.name} on ${runtime}`;
    console.log(`\n=== Starting ${testName} ===`);

    const runs = [];

    for (let run = 1; run <= this.config.runs; run++) {
      console.log(`\n--- Run ${run}/${this.config.runs} for ${testName} ---`);

      // Start server
      const serverProcess = spawn(runtime, [framework.script], {
        stdio: "pipe",
        env: {
          ...process.env,
          NODE_ENV: "production",
          PORT: framework.port.toString(),
        },
      });

      let serverOutput = "";
      let serverError = "";

      serverProcess.stdout.on("data", (data) => {
        serverOutput += data.toString();
      });

      serverProcess.stderr.on("data", (data) => {
        serverError += data.toString();
      });

      // Wait for server to start
      await this.sleep(this.config.warmupTime);

      // Verify server is running
      const serverReady = await this.waitForServer(framework.port);
      if (!serverReady) {
        console.error(
          `❌ Server ${testName} failed to start on port ${framework.port}`,
        );
        console.error("Server output:", serverOutput);
        console.error("Server error:", serverError);
        serverProcess.kill("SIGTERM");
        await this.sleep(1000);
        if (!serverProcess.killed) {
          serverProcess.kill("SIGKILL");
        }
        continue;
      }

      console.log(`✅ Server started successfully on port ${framework.port}`);

      try {
        const result = await autocannon({
          url: `http://localhost:${framework.port}${framework.endpoint}`,
          connections: this.config.connections,
          duration: this.config.duration,
          pipelining: this.config.pipelining,
          timeout: this.config.timeout,
        });

        const runResult = {
          requestsPerSecond: result.requests.average,
          latency: {
            average: result.latency.average,
            p50: result.latency.p50,
            p90: result.latency.p90,
            p95: result.latency.p95,
            p99: result.latency.p99,
          },
          throughput: result.throughput.average,
          errors: result.errors || 0,
          timeouts: result.timeouts || 0,
          non2xx: result.non2xx || 0,
          totalRequests: result.requests.total,
          duration: result.duration,
        };

        runs.push(runResult);

        console.log(`📊 Run ${run} Results:`);
        console.log(
          `  Requests/sec: ${runResult.requestsPerSecond.toFixed(2)}`,
        );
        console.log(
          `  Latency (avg): ${runResult.latency.average.toFixed(2)}ms`,
        );
        console.log(
          `  Latency (p95): ${(runResult.latency.p95 || 0).toFixed(2)}ms`,
        );
        console.log(
          `  Latency (p99): ${(runResult.latency.p99 || 0).toFixed(2)}ms`,
        );
        console.log(
          `  Throughput: ${(runResult.throughput / 1024 / 1024).toFixed(2)} MB/sec`,
        );
        console.log(`  Errors: ${runResult.errors}`);
        console.log(`  Total Requests: ${runResult.totalRequests}`);
      } catch (error) {
        console.error(`❌ Error in run ${run} for ${testName}:`, error.message);
      }

      // Kill server and wait for cleanup
      serverProcess.kill("SIGTERM");
      await this.sleep(1000);
      if (!serverProcess.killed) {
        serverProcess.kill("SIGKILL");
      }
      await this.sleep(this.config.cooldownTime);
    }

    if (runs.length > 0) {
      // Calculate statistics
      const stats = this.calculateStats(runs);

      const result = {
        framework: framework.name,
        runtime: runtime,
        port: framework.port,
        responseType: framework.responseType,
        ...stats,
        runs: runs.length,
        rawRuns: runs,
      };

      this.results.push(result);

      console.log(`\n📈 ${testName} - Final Results (${runs.length} runs):`);
      console.log(
        `  Requests/sec: ${stats.requestsPerSecond.toFixed(2)} (±${stats.stdRps.toFixed(2)})`,
      );
      console.log(
        `  Latency (avg): ${stats.latency.average.toFixed(2)}ms (±${stats.stdLatency.toFixed(2)}ms)`,
      );
      console.log(`  Latency (p95): ${(stats.latency.p95 || 0).toFixed(2)}ms`);
      console.log(
        `  Throughput: ${(stats.throughput / 1024 / 1024).toFixed(2)} MB/sec`,
      );
      console.log(
        `  Success Rate: ${((1 - stats.errorRate) * 100).toFixed(2)}%`,
      );
    }

    return runs.length > 0;
  }

  calculateStats(runs) {
    const n = runs.length;

    // Requests per second
    const rpsValues = runs.map((r) => r.requestsPerSecond);
    const avgRps = rpsValues.reduce((sum, val) => sum + val, 0) / n;
    const stdRps = Math.sqrt(
      rpsValues.reduce((sum, val) => sum + Math.pow(val - avgRps, 2), 0) / n,
    );

    // Latency
    const latencyAvgValues = runs.map((r) => r.latency.average);
    const avgLatency = latencyAvgValues.reduce((sum, val) => sum + val, 0) / n;
    const stdLatency = Math.sqrt(
      latencyAvgValues.reduce(
        (sum, val) => sum + Math.pow(val - avgLatency, 2),
        0,
      ) / n,
    );

    // Other latency percentiles
    const p50Values = runs.map((r) => r.latency.p50);
    const p90Values = runs.map((r) => r.latency.p90);
    const p95Values = runs.map((r) => r.latency.p95);
    const p99Values = runs.map((r) => r.latency.p99);

    // Throughput
    const throughputValues = runs.map((r) => r.throughput);
    const avgThroughput =
      throughputValues.reduce((sum, val) => sum + val, 0) / n;

    // Error rates
    const totalRequests = runs.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalErrors = runs.reduce(
      (sum, r) => sum + r.errors + r.timeouts + r.non2xx,
      0,
    );
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      requestsPerSecond: avgRps,
      stdRps,
      latency: {
        average: avgLatency,
        p50: p50Values.reduce((sum, val) => sum + val, 0) / n,
        p90: p90Values.reduce((sum, val) => sum + val, 0) / n,
        p95: p95Values.reduce((sum, val) => sum + val, 0) / n,
        p99: p99Values.reduce((sum, val) => sum + val, 0) / n,
      },
      stdLatency,
      throughput: avgThroughput,
      errorRate,
      totalRequests,
      totalErrors,
    };
  }

  async runAllBenchmarks() {
    console.log("🚀 Starting Comprehensive Framework Benchmark...\n");

    const systemInfo = await this.getSystemInfo();
    console.log("📋 System Information:");
    console.log(`  Node.js: ${systemInfo.nodeVersion}`);
    console.log(`  Bun: ${systemInfo.bunVersion}`);
    console.log(`  Platform: ${systemInfo.platform} ${systemInfo.arch}`);
    console.log(`  CPU: ${systemInfo.cpuModel || "unknown"}`);
    console.log(`  CPUs: ${systemInfo.cpus}`);
    console.log(
      `  Memory: ${systemInfo.freeMemory}GB / ${systemInfo.totalMemory}GB`,
    );

    console.log("\n⚙️  Test Configuration:");
    console.log(`  Connections: ${this.config.connections}`);
    console.log(`  Duration: ${this.config.duration} seconds`);
    console.log(`  Pipelining: ${this.config.pipelining}`);
    console.log(`  Runs per setup: ${this.config.runs}`);
    console.log(`  Warmup time: ${this.config.warmupTime}ms`);
    console.log(`  Cooldown time: ${this.config.cooldownTime}ms`);

    // Run benchmarks for all combinations
    const totalTests = this.frameworks.length * this.runtimes.length;
    let completed = 0;

    for (const framework of this.frameworks) {
      for (const runtime of this.runtimes) {
        completed++;
        console.log(`\n🏃 Progress: ${completed}/${totalTests} tests`);

        try {
          await this.runSingleBenchmark(framework, runtime);
        } catch (error) {
          console.error(
            `💥 Fatal error in ${framework.name} on ${runtime}:`,
            error,
          );
        }
      }
    }

    return this.generateReport(systemInfo);
  }

  generateReport(systemInfo) {
    // Sort results by performance
    this.results.sort((a, b) => b.requestsPerSecond - a.requestsPerSecond);

    const report = {
      metadata: {
        timestamp: systemInfo.timestamp,
        version: "2.0.0",
        generator: "Enhanced Framework Benchmark",
      },
      environment: systemInfo,
      configuration: this.config,
      summary: {
        totalTests: this.results.length,
        frameworks: [...new Set(this.results.map((r) => r.framework))],
        runtimes: [...new Set(this.results.map((r) => r.runtime))],
        successfulTests: this.results.filter((r) => r.runs > 0).length,
      },
      results: this.results,
      rankings: {
        byRequestsPerSecond: this.results.map((r, i) => ({
          rank: i + 1,
          name: `${r.framework} on ${r.runtime}`,
          value: r.requestsPerSecond,
          stdDev: r.stdRps,
        })),
        byLatency: [...this.results]
          .sort((a, b) => a.latency.average - b.latency.average)
          .map((r, i) => ({
            rank: i + 1,
            name: `${r.framework} on ${r.runtime}`,
            value: r.latency.average,
            stdDev: r.stdLatency,
          })),
      },
      comparisons: this.generateComparisons(),
    };

    return report;
  }

  generateComparisons() {
    const comparisons = {};

    // Group by framework
    const byFramework = {};
    this.results.forEach((result) => {
      if (!byFramework[result.framework]) {
        byFramework[result.framework] = {};
      }
      byFramework[result.framework][result.runtime] = result;
    });

    // Calculate runtime improvements
    Object.keys(byFramework).forEach((framework) => {
      const runtimes = byFramework[framework];
      if (runtimes.node && runtimes.bun) {
        const nodeRps = runtimes.node.requestsPerSecond;
        const bunRps = runtimes.bun.requestsPerSecond;
        const improvement = ((bunRps - nodeRps) / nodeRps) * 100;

        comparisons[framework] = {
          node: {
            requestsPerSecond: nodeRps,
            latency: runtimes.node.latency.average,
          },
          bun: {
            requestsPerSecond: bunRps,
            latency: runtimes.bun.latency.average,
          },
          improvement: {
            percentage: improvement,
            description: improvement > 0 ? "faster" : "slower",
          },
        };
      }
    });

    return comparisons;
  }

  printSummary() {
    if (this.results.length === 0) {
      console.log("❌ No benchmark results to display");
      return;
    }

    console.log("\n🏆 FINAL RESULTS SUMMARY");
    console.log("=".repeat(80));

    console.log("\n📊 Performance Rankings (Requests/Second):");
    this.results.forEach((result, index) => {
      const rank = index + 1;
      const emoji =
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "  ";
      console.log(
        `${emoji} ${rank}. ${result.framework} on ${result.runtime}: ${result.requestsPerSecond.toFixed(2)} req/sec (±${result.stdRps.toFixed(2)})`,
      );
    });

    console.log("\n⚡ Runtime Comparisons:");
    const comparisons = this.generateComparisons();
    Object.keys(comparisons).forEach((framework) => {
      const comp = comparisons[framework];
      const emoji = comp.improvement.percentage > 0 ? "⬆️" : "⬇️";
      console.log(
        `${framework}: Bun is ${Math.abs(comp.improvement.percentage).toFixed(1)}% ${comp.improvement.description} than Node.js ${emoji}`,
      );
    });

    console.log("\n📈 Detailed Performance Table:");
    console.log(
      "Framework".padEnd(20) +
        "Runtime".padEnd(10) +
        "Req/sec".padEnd(12) +
        "Latency(ms)".padEnd(12) +
        "P95(ms)".padEnd(10) +
        "Success%",
    );
    console.log("-".repeat(80));

    this.results.forEach((result) => {
      const successRate = ((1 - result.errorRate) * 100).toFixed(1);
      console.log(
        result.framework.padEnd(20) +
          result.runtime.padEnd(10) +
          result.requestsPerSecond.toFixed(2).padEnd(12) +
          result.latency.average.toFixed(2).padEnd(12) +
          (result.latency.p95 || 0).toFixed(2).padEnd(10) +
          `${successRate}%`,
      );
    });
  }

  async saveResults(filename = "benchmark_results.json") {
    const systemInfo = await this.getSystemInfo();
    const report = this.generateReport(systemInfo);

    const outputPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log(`\n💾 Results saved to: ${outputPath}`);
    return report;
  }
}

// Main execution
async function main() {
  const benchmark = new BenchmarkRunner();

  try {
    const report = await benchmark.runAllBenchmarks();
    benchmark.printSummary();
    await benchmark.saveResults();

    console.log("\n✅ Benchmark completed successfully!");
    console.log("📄 Check benchmark_results.json for detailed results");
  } catch (error) {
    console.error("\n💥 Benchmark failed:", error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { BenchmarkRunner };

// Run if this file is executed directly
if (require.main === module) {
  main();
}
