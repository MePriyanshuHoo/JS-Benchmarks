#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const https = require('https');
const os = require('os');

class FrameworkBenchmarkSetup {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
    this.errors = [];
    this.warnings = [];
    this.config = {
      skipBun: false,
      skipValidation: false,
      verbose: false,
      force: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      step: '\x1b[35m',     // Magenta
      reset: '\x1b[0m'      // Reset
    };

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '🔧'
    };

    console.log(`${colors[type]}[${timestamp}] ${icons[type]} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        ...options
      });

      let output = '';
      let error = '';

      if (!this.config.verbose) {
        process.stdout?.on('data', (data) => {
          output += data.toString();
        });

        process.stderr?.on('data', (data) => {
          error += data.toString();
        });
      }

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ output, error });
        } else {
          reject(new Error(`Command failed with code ${code}: ${error || output}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'step');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
      this.errors.push(`Node.js ${nodeVersion} is too old. Please upgrade to v18 or higher.`);
      return false;
    } else {
      this.log(`Node.js ${nodeVersion} ✓`, 'success');
    }

    // Check npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.log(`npm ${npmVersion} ✓`, 'success');
    } catch (error) {
      this.errors.push('npm is not installed or not in PATH');
      return false;
    }

    // Check if we're in the right directory
    if (!fs.existsSync('package.json')) {
      this.errors.push('package.json not found. Please run this script from the project root directory.');
      return false;
    }

    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.name !== 'framework-benchmark') {
      this.warnings.push(`Expected package name 'framework-benchmark', got '${pkg.name}'`);
    }

    // Check Bun (optional)
    if (!this.config.skipBun) {
      try {
        const bunVersion = execSync('bun --version', { encoding: 'utf8', timeout: 5000 }).trim();
        this.log(`Bun ${bunVersion} ✓`, 'success');
      } catch (error) {
        this.warnings.push('Bun is not installed. Installing...');
        await this.installBun();
      }
    }

    // Check available ports
    const requiredPorts = [3000, 3001, 3002];
    for (const port of requiredPorts) {
      const isAvailable = await this.checkPortAvailable(port);
      if (!isAvailable) {
        this.warnings.push(`Port ${port} appears to be in use. This may cause issues during testing.`);
      }
    }

    this.log('Prerequisites check completed', 'success');
    return true;
  }

  async checkPortAvailable(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();

      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });

      server.on('error', () => {
        resolve(false);
      });
    });
  }

  async installBun() {
    if (this.config.skipBun) {
      this.log('Skipping Bun installation', 'warning');
      return;
    }

    this.log('Installing Bun...', 'step');

    try {
      if (process.platform === 'win32') {
        this.log('Detected Windows. Please install Bun manually from https://bun.sh/', 'warning');
        this.config.skipBun = true;
        return;
      }

      // Download and install Bun
      await this.runCommand('curl', ['-fsSL', 'https://bun.sh/install'], { shell: true });

      // Verify installation
      const bunVersion = execSync('bun --version', { encoding: 'utf8' }).trim();
      this.log(`Bun ${bunVersion} installed successfully`, 'success');

    } catch (error) {
      this.warnings.push(`Failed to install Bun: ${error.message}`);
      this.config.skipBun = true;
    }
  }

  async installDependencies() {
    this.log('Installing Node.js dependencies...', 'step');

    try {
      await this.runCommand('npm', ['install']);
      this.log('Node.js dependencies installed', 'success');
    } catch (error) {
      this.errors.push(`Failed to install Node.js dependencies: ${error.message}`);
      return false;
    }

    if (!this.config.skipBun) {
      this.log('Installing Bun dependencies...', 'step');
      try {
        await this.runCommand('bun', ['install']);
        this.log('Bun dependencies installed', 'success');
      } catch (error) {
        this.warnings.push(`Failed to install Bun dependencies: ${error.message}`);
      }
    }

    return true;
  }

  async createDirectories() {
    this.log('Creating required directories...', 'step');

    const directories = [
      'data',
      'data/historical',
      'results',
      'scripts'
    ];

    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.log(`Created directory: ${dir}`, 'success');
        }
      } catch (error) {
        this.warnings.push(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }

  async testServerStartup() {
    this.log('Testing server implementations...', 'step');

    const servers = [
      { name: 'Express', script: 'express_server.js', port: 3000 },
      { name: 'Fastify', script: 'fastify_server.js', port: 3001 },
      { name: 'Hono', script: 'hono_server.js', port: 3002 }
    ];

    let allPassed = true;

    for (const server of servers) {
      try {
        if (!fs.existsSync(server.script)) {
          this.errors.push(`Server file not found: ${server.script}`);
          allPassed = false;
          continue;
        }

        this.log(`Testing ${server.name} server...`, 'info');

        // Start server
        const serverProcess = spawn('node', [server.script], {
          stdio: 'pipe',
          env: { ...process.env, NODE_ENV: 'production' }
        });

        // Give server time to start
        await this.sleep(3000);

        // Test connection
        const http = require('http');
        const testResult = await new Promise((resolve) => {
          const req = http.request(`http://localhost:${server.port}`, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(5000);
          req.end();
        });

        // Clean up
        serverProcess.kill('SIGTERM');
        await this.sleep(1000);
        if (!serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }

        if (testResult) {
          this.log(`${server.name} server: PASSED`, 'success');
        } else {
          this.warnings.push(`${server.name} server test failed`);
          allPassed = false;
        }

        await this.sleep(1000);

      } catch (error) {
        this.warnings.push(`${server.name} server test error: ${error.message}`);
        allPassed = false;
      }
    }

    return allPassed;
  }

  async runInitialBenchmark() {
    this.log('Running initial benchmark test...', 'step');

    try {
      // Check if benchmark script exists
      if (!fs.existsSync('scripts/benchmark.js')) {
        this.warnings.push('Benchmark script not found, skipping initial test');
        return true;
      }

      // Create a light benchmark for initial test
      const lightBenchmarkConfig = `
const { BenchmarkRunner } = require('./scripts/benchmark.js');

class InitialTestRunner extends BenchmarkRunner {
  constructor() {
    super();
    this.config = {
      ...this.config,
      connections: 10,
      duration: 5,
      runs: 1,
      warmupTime: 1000,
      cooldownTime: 500
    };
  }
}

async function main() {
  const benchmark = new InitialTestRunner();
  const report = await benchmark.runAllBenchmarks();
  await benchmark.saveResults('initial_test_results.json');
  console.log('Initial benchmark test completed');
}

main().catch(console.error);
`;

      fs.writeFileSync('initial_test.js', lightBenchmarkConfig);

      this.log('Running light benchmark (this may take a minute)...', 'info');
      await this.runCommand('node', ['initial_test.js']);

      // Clean up
      fs.unlinkSync('initial_test.js');

      if (fs.existsSync('initial_test_results.json')) {
        fs.unlinkSync('initial_test_results.json');
        this.log('Initial benchmark test: PASSED', 'success');
        return true;
      } else {
        this.warnings.push('Initial benchmark test did not produce results');
        return false;
      }

    } catch (error) {
      this.warnings.push(`Initial benchmark test failed: ${error.message}`);
      return false;
    }
  }

  async validateSetup() {
    if (this.config.skipValidation) {
      this.log('Skipping validation', 'warning');
      return true;
    }

    this.log('Running setup validation...', 'step');

    try {
      if (fs.existsSync('scripts/validate-setup.js')) {
        await this.runCommand('node', ['scripts/validate-setup.js', '--quick']);
        this.log('Setup validation: PASSED', 'success');
        return true;
      } else {
        this.warnings.push('Validation script not found, skipping validation');
        return true;
      }
    } catch (error) {
      this.warnings.push(`Setup validation failed: ${error.message}`);
      return false;
    }
  }

  async createConfigFile() {
    this.log('Creating configuration file...', 'step');

    const config = {
      version: '2.0.0',
      created: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        skipBun: this.config.skipBun
      },
      benchmark: {
        defaultConfig: {
          connections: 100,
          duration: 30,
          runs: 3,
          warmupTime: 3000,
          cooldownTime: 2000
        }
      },
      frameworks: [
        {
          name: 'Express',
          port: 3000,
          script: 'express_server.js'
        },
        {
          name: 'Fastify',
          port: 3001,
          script: 'fastify_server.js'
        },
        {
          name: 'Hono',
          port: 3002,
          script: 'hono_server.js'
        }
      ]
    };

    try {
      fs.writeFileSync('benchmark.config.json', JSON.stringify(config, null, 2));
      this.log('Configuration file created', 'success');
    } catch (error) {
      this.warnings.push(`Failed to create config file: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    this.log('FRAMEWORK BENCHMARK SETUP COMPLETE', 'success');
    console.log('='.repeat(70));

    if (this.errors.length === 0) {
      this.log('🎉 Setup completed successfully!', 'success');
    } else {
      this.log('⚠️ Setup completed with some issues', 'warning');
    }

    if (this.errors.length > 0) {
      this.log('\n❌ Errors that need attention:', 'error');
      this.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'error');
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️ Warnings:', 'warning');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'warning');
      });
    }

    this.log('\n🚀 Next Steps:', 'info');
    this.log('  • Run a full benchmark: npm run benchmark:full', 'info');
    this.log('  • Generate README: npm run readme:generate', 'info');
    this.log('  • Run development benchmark: npm run dev:benchmark', 'info');
    this.log('  • Test individual servers:', 'info');
    this.log('    - npm run express:node', 'info');
    this.log('    - npm run fastify:node', 'info');
    this.log('    - npm run hono:node', 'info');

    if (!this.config.skipBun) {
      this.log('  • Test with Bun runtime:', 'info');
      this.log('    - npm run express:bun', 'info');
      this.log('    - npm run fastify:bun', 'info');
      this.log('    - npm run hono:bun', 'info');
    }

    this.log('\n📚 Documentation:', 'info');
    this.log('  • Read CONTRIBUTING.md for development guidelines', 'info');
    this.log('  • Check generated README.md for usage instructions', 'info');
    this.log('  • Review benchmark.config.json for configuration options', 'info');

    this.log('\n🔧 Troubleshooting:', 'info');
    this.log('  • Validate setup: node scripts/validate-setup.js', 'info');
    this.log('  • Clean and restart: npm run clean && npm run setup', 'info');
    this.log('  • Check logs for detailed error information', 'info');

    console.log('\n' + '='.repeat(70));

    return this.errors.length === 0;
  }

  async setup() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                Framework Benchmark Setup                        ║
║                                                                  ║
║  Setting up automated benchmark suite for Express, Fastify,     ║
║  and Hono frameworks across Node.js and Bun runtimes.           ║
╚══════════════════════════════════════════════════════════════════╝
`);

    this.log(`Setup started in: ${process.cwd()}`, 'info');
    this.log(`Node.js version: ${process.version}`, 'info');
    this.log(`Platform: ${process.platform} ${process.arch}`, 'info');

    try {
      // Step 1: Check prerequisites
      if (!(await this.checkPrerequisites())) {
        this.log('Prerequisites check failed', 'error');
        return this.generateReport();
      }

      // Step 2: Install dependencies
      if (!(await this.installDependencies())) {
        this.log('Dependency installation failed', 'error');
        return this.generateReport();
      }

      // Step 3: Create directories
      await this.createDirectories();

      // Step 4: Test servers
      if (!(await this.testServerStartup())) {
        this.log('Server tests failed', 'warning');
      }

      // Step 5: Run initial benchmark
      if (!(await this.runInitialBenchmark())) {
        this.log('Initial benchmark test failed', 'warning');
      }

      // Step 6: Validate setup
      if (!(await this.validateSetup())) {
        this.log('Setup validation failed', 'warning');
      }

      // Step 7: Create config file
      await this.createConfigFile();

      return this.generateReport();

    } catch (error) {
      this.errors.push(`Setup failed: ${error.message}`);
      this.log(`Fatal error during setup: ${error.message}`, 'error');
      return this.generateReport();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const setup = new FrameworkBenchmarkSetup();

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--skip-bun':
        setup.config.skipBun = true;
        break;
      case '--skip-validation':
        setup.config.skipValidation = true;
        break;
      case '--verbose':
      case '-v':
        setup.config.verbose = true;
        break;
      case '--force':
      case '-f':
        setup.config.force = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Framework Benchmark Setup Script

Usage: node scripts/setup.js [options]

Options:
  --skip-bun         Skip Bun installation and testing
  --skip-validation  Skip final validation step
  --verbose, -v      Show detailed command output
  --force, -f        Force setup even if already configured
  --help, -h         Show this help message

Examples:
  node scripts/setup.js                    # Full setup
  node scripts/setup.js --skip-bun         # Setup without Bun
  node scripts/setup.js --verbose          # Detailed output
  node scripts/setup.js --skip-validation  # Skip final validation
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown option: ${arg}`);
        }
    }
  }

  // Check if already configured
  if (fs.existsSync('benchmark.config.json') && !setup.config.force) {
    console.log('⚠️ Setup appears to already be complete.');
    console.log('Use --force to run setup anyway, or run validation:');
    console.log('  node scripts/validate-setup.js');
    process.exit(0);
  }

  const success = await setup.setup();
  process.exit(success ? 0 : 1);
}

// Export for testing
module.exports = { FrameworkBenchmarkSetup };

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
