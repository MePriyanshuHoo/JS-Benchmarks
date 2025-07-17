#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

class ServerTester {
  constructor() {
    this.servers = [
      { name: 'Express', script: 'express_server.js', port: 3000 },
      { name: 'Fastify', script: 'fastify_server.js', port: 3001 },
      { name: 'Hono', script: 'hono_server.js', port: 3002 }
    ];
    this.results = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      error: '\x1b[31m',    // Red
      warning: '\x1b[33m',  // Yellow
      reset: '\x1b[0m'      // Reset
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    console.log(`${colors[type]}${icons[type]} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testServer(server) {
    this.log(`Testing ${server.name} server...`, 'info');

    return new Promise((resolve) => {
      let resolved = false;
      let serverOutput = '';
      let serverError = '';

      // Start server
      const serverProcess = spawn('node', [server.script], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });

      serverProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
      });

      serverProcess.stderr.on('data', (data) => {
        serverError += data.toString();
      });

      serverProcess.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          this.log(`${server.name} failed to start: ${error.message}`, 'error');
          resolve(false);
        }
      });

      // Give server time to start up
      setTimeout(() => {
        if (resolved) return;

        // Test HTTP connection
        const req = http.request(`http://localhost:${server.port}`, (res) => {
          if (!resolved) {
            resolved = true;
            const success = res.statusCode === 200;

            if (success) {
              this.log(`${server.name} server: PASSED (${res.statusCode})`, 'success');
            } else {
              this.log(`${server.name} server: FAILED (${res.statusCode})`, 'error');
            }

            // Clean up
            serverProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
              }
            }, 1000);

            resolve(success);
          }
        });

        req.on('error', (error) => {
          if (!resolved) {
            resolved = true;
            this.log(`${server.name} connection failed: ${error.message}`, 'error');

            // Show server output for debugging
            if (serverOutput) {
              console.log(`Server output: ${serverOutput.trim()}`);
            }
            if (serverError) {
              console.log(`Server error: ${serverError.trim()}`);
            }

            serverProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
              }
            }, 1000);

            resolve(false);
          }
        });

        req.setTimeout(5000, () => {
          if (!resolved) {
            resolved = true;
            this.log(`${server.name} connection timeout`, 'error');
            serverProcess.kill('SIGTERM');
            resolve(false);
          }
        });

        req.end();

      }, 3000); // Wait 3 seconds for server to start

      // Overall timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.log(`${server.name} test timeout`, 'error');
          serverProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!serverProcess.killed) {
              serverProcess.kill('SIGKILL');
            }
          }, 1000);
          resolve(false);
        }
      }, 15000); // 15 second overall timeout
    });
  }

  async testAllServers() {
    this.log('Starting server tests...', 'info');
    console.log('='.repeat(50));

    let passedCount = 0;

    for (const server of this.servers) {
      try {
        const result = await this.testServer(server);
        this.results.push({
          server: server.name,
          passed: result,
          port: server.port
        });

        if (result) {
          passedCount++;
        }

        // Wait between tests to avoid port conflicts
        await this.sleep(2000);

      } catch (error) {
        this.log(`Unexpected error testing ${server.name}: ${error.message}`, 'error');
        this.results.push({
          server: server.name,
          passed: false,
          error: error.message
        });
      }
    }

    return this.generateReport(passedCount);
  }

  generateReport(passedCount) {
    console.log('\n' + '='.repeat(50));
    this.log('SERVER TEST RESULTS', 'info');
    console.log('='.repeat(50));

    this.results.forEach(result => {
      const status = result.passed ? 'PASSED' : 'FAILED';
      const type = result.passed ? 'success' : 'error';
      this.log(`${result.server.padEnd(10)}: ${status}`, type);
    });

    const totalTests = this.servers.length;
    const success = passedCount === totalTests;

    console.log('\n' + '-'.repeat(30));
    this.log(`Results: ${passedCount}/${totalTests} servers passed`, success ? 'success' : 'error');

    if (success) {
      this.log('All server tests passed! 🎉', 'success');
    } else {
      this.log('Some server tests failed. Check the output above for details.', 'error');

      console.log('\nTroubleshooting:');
      console.log('• Check if ports 3000-3002 are available');
      console.log('• Verify all dependencies are installed (npm install)');
      console.log('• Check server files for syntax errors');
      console.log('• Run individual servers manually to debug');
    }

    console.log('='.repeat(50));
    return success;
  }

  async checkPortsAvailable() {
    this.log('Checking port availability...', 'info');

    const checkPort = (port) => {
      return new Promise((resolve) => {
        const net = require('net');
        const server = net.createServer();

        server.listen(port, () => {
          server.once('close', () => resolve(true));
          server.close();
        });

        server.on('error', () => resolve(false));
      });
    };

    let allAvailable = true;
    for (const server of this.servers) {
      const available = await checkPort(server.port);
      if (!available) {
        this.log(`Port ${server.port} (${server.name}) is in use`, 'warning');
        allAvailable = false;
      }
    }

    if (allAvailable) {
      this.log('All required ports are available', 'success');
    }

    return allAvailable;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    help: args.includes('--help') || args.includes('-h'),
    checkPorts: args.includes('--check-ports'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  if (flags.help) {
    console.log(`
Server Testing Script

Usage: node scripts/test-servers.js [options]

Options:
  --help, -h        Show this help message
  --check-ports     Only check if ports are available
  --verbose, -v     Show detailed output

Examples:
  node scripts/test-servers.js              # Test all servers
  node scripts/test-servers.js --check-ports # Check port availability
  node scripts/test-servers.js --verbose     # Detailed output
`);
    process.exit(0);
  }

  const tester = new ServerTester();

  try {
    if (flags.checkPorts) {
      const available = await tester.checkPortsAvailable();
      process.exit(available ? 0 : 1);
      return;
    }

    // Check ports first
    const portsAvailable = await tester.checkPortsAvailable();
    if (!portsAvailable) {
      console.log('\nWarning: Some ports are in use. Tests may fail.');
      console.log('Consider stopping other services or waiting a moment.\n');
    }

    const success = await tester.testAllServers();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\nFatal error during server testing:', error.message);
    if (flags.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Export for testing
module.exports = { ServerTester };

// Run if executed directly
if (require.main === module) {
  main();
}
