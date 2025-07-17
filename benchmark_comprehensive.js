const { spawn } = require('child_process');
const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Best practices configuration
const BENCHMARK_CONFIG = {
  connections: 100,
  duration: 30,
  pipelining: 1,
  warmupTime: 3000,
  cooldownTime: 2000,
  runs: 3, // Multiple runs for statistical accuracy
  timeout: 10000
};

const setups = [
  { name: 'Express on Node.js', port: 3000, runtime: 'node', framework: 'express', script: 'express_server.js' },
  { name: 'Express on Bun', port: 3000, runtime: 'bun', framework: 'express', script: 'express_server.js' },
  { name: 'Fastify on Node.js', port: 3001, runtime: 'node', framework: 'fastify', script: 'fastify_server.js' },
  { name: 'Fastify on Bun', port: 3001, runtime: 'bun', framework: 'fastify', script: 'fastify_server.js' },
  { name: 'Hono on Node.js', port: 3002, runtime: 'node', framework: 'hono', script: 'hono_server.js' },
  { name: 'Hono on Bun', port: 3002, runtime: 'bun', framework: 'hono', script: 'hono_server.js' }
];

const results = [];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerHealth(port) {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request(`http://localhost:${port}`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000);
    req.end();
  });
}

async function waitForServer(port, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkServerHealth(port)) {
      return true;
    }
    await sleep(500);
  }
  return false;
}

async function runBenchmark(setup) {
  console.log(`\\n=== Starting ${setup.name} ===`);
  
  const runs = [];
  
  for (let run = 1; run <= BENCHMARK_CONFIG.runs; run++) {
    console.log(`\\n--- Run ${run}/${BENCHMARK_CONFIG.runs} for ${setup.name} ---`);
    
    // Start server
    const serverProcess = spawn(setup.runtime, [setup.script], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // Wait for server to start
    await sleep(BENCHMARK_CONFIG.warmupTime);
    
    // Verify server is running
    const serverReady = await waitForServer(setup.port);
    if (!serverReady) {
      console.error(`Server ${setup.name} failed to start on port ${setup.port}`);
      serverProcess.kill();
      continue;
    }

    try {
      const result = await autocannon({
        url: `http://localhost:${setup.port}`,
        connections: BENCHMARK_CONFIG.connections,
        duration: BENCHMARK_CONFIG.duration,
        pipelining: BENCHMARK_CONFIG.pipelining,
        timeout: BENCHMARK_CONFIG.timeout
      });

      runs.push({
        requestsPerSecond: result.requests.average,
        latency: result.latency.average,
        throughput: result.throughput.average,
        errors: result.errors || 0
      });

      console.log(`Run ${run} Results:`);
      console.log(`  Requests/sec: ${result.requests.average.toFixed(2)}`);
      console.log(`  Latency (ms): ${result.latency.average.toFixed(2)}`);
      console.log(`  Throughput (bytes/sec): ${result.throughput.average.toFixed(2)}`);
      console.log(`  Errors: ${result.errors || 0}`);

    } catch (error) {
      console.error(`Error in run ${run} for ${setup.name}:`, error.message);
    }

    // Kill server and wait for cleanup
    serverProcess.kill();
    await sleep(BENCHMARK_CONFIG.cooldownTime);
  }

  if (runs.length > 0) {
    // Calculate averages and standard deviations
    const avgRps = runs.reduce((sum, run) => sum + run.requestsPerSecond, 0) / runs.length;
    const avgLatency = runs.reduce((sum, run) => sum + run.latency, 0) / runs.length;
    const avgThroughput = runs.reduce((sum, run) => sum + run.throughput, 0) / runs.length;
    const totalErrors = runs.reduce((sum, run) => sum + run.errors, 0);

    // Standard deviation calculation
    const stdRps = Math.sqrt(runs.reduce((sum, run) => sum + Math.pow(run.requestsPerSecond - avgRps, 2), 0) / runs.length);
    const stdLatency = Math.sqrt(runs.reduce((sum, run) => sum + Math.pow(run.latency - avgLatency, 2), 0) / runs.length);

    results.push({
      environment: setup.name,
      runtime: setup.runtime,
      framework: setup.framework,
      requestsPerSecond: avgRps,
      latency: avgLatency,
      throughput: avgThroughput,
      errors: totalErrors,
      stdRps,
      stdLatency,
      runs: runs.length
    });

    console.log(`\\n${setup.name} - Average Results (${runs.length} runs):`);
    console.log(`  Requests/sec: ${avgRps.toFixed(2)} (±${stdRps.toFixed(2)})`);
    console.log(`  Latency (ms): ${avgLatency.toFixed(2)} (±${stdLatency.toFixed(2)})`);
    console.log(`  Throughput (bytes/sec): ${avgThroughput.toFixed(2)}`);
    console.log(`  Total Errors: ${totalErrors}`);
  }
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      bunVersion: 'unknown', // Will be filled if available
      platform: process.platform,
      arch: process.arch,
      cpus: require('os').cpus().length
    },
    config: BENCHMARK_CONFIG,
    results: results
  };

  return report;
}

async function main() {
  console.log('Starting Comprehensive Framework Benchmark...\\n');
  console.log('Configuration:');
  console.log(`- Connections: ${BENCHMARK_CONFIG.connections}`);
  console.log(`- Duration: ${BENCHMARK_CONFIG.duration} seconds`);
  console.log(`- Pipelining: ${BENCHMARK_CONFIG.pipelining}`);
  console.log(`- Runs per setup: ${BENCHMARK_CONFIG.runs}`);
  console.log(`- Warmup time: ${BENCHMARK_CONFIG.warmupTime}ms`);
  console.log(`- Cooldown time: ${BENCHMARK_CONFIG.cooldownTime}ms`);

  // Get runtime versions
  console.log('\\n=== Runtime Versions ===');
  console.log(`Node.js: ${process.version}`);
  try {
    const bunVersion = require('child_process').execSync('bun --version', { encoding: 'utf8' }).trim();
    console.log(`Bun: ${bunVersion}`);
  } catch (error) {
    console.log('Bun: Not available');
  }

  for (const setup of setups) {
    await runBenchmark(setup);
  }

  console.log('\\n=== FINAL RESULTS ===');
  results.sort((a, b) => b.requestsPerSecond - a.requestsPerSecond);
  
  console.log('\\nRanking by Requests/Second:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.environment}: ${result.requestsPerSecond.toFixed(2)} req/sec (±${result.stdRps.toFixed(2)})`);
  });

  console.log('\\nDetailed Comparison:');
  console.log('Environment\\t\\t\\tReq/sec\\t\\tLatency(ms)\\tThroughput(bytes/sec)\\tErrors');
  console.log('----------------------------------------------------------------------------------------');
  results.forEach(result => {
    console.log(`${result.environment.padEnd(30)}\\t${result.requestsPerSecond.toFixed(2).padEnd(10)}\\t${result.latency.toFixed(2).padEnd(10)}\\t${result.throughput.toFixed(2).padEnd(15)}\\t${result.errors}`);
  });

  // Node.js vs Bun comparison
  console.log('\\n=== Node.js vs Bun Comparison ===');
  const frameworkGroups = {};
  results.forEach(result => {
    if (!frameworkGroups[result.framework]) {
      frameworkGroups[result.framework] = {};
    }
    frameworkGroups[result.framework][result.runtime] = result;
  });

  Object.keys(frameworkGroups).forEach(framework => {
    const group = frameworkGroups[framework];
    if (group.node && group.bun) {
      const improvement = ((group.bun.requestsPerSecond - group.node.requestsPerSecond) / group.node.requestsPerSecond) * 100;
      console.log(`\\n${framework.toUpperCase()}:`);
      console.log(`  Node.js: ${group.node.requestsPerSecond.toFixed(2)} req/sec`);
      console.log(`  Bun: ${group.bun.requestsPerSecond.toFixed(2)} req/sec`);
      console.log(`  Improvement: ${improvement.toFixed(1)}%`);
    }
  });

  // Save results to file
  const report = generateReport(results);
  fs.writeFileSync('benchmark_results.json', JSON.stringify(report, null, 2));
  console.log('\\nDetailed results saved to benchmark_results.json');
}

main().catch(console.error);
