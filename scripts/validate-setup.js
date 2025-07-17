#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

class SetupValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.results = {
      dependencies: false,
      servers: false,
      benchmark: false,
      readme: false,
      structure: false,
      workflows: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colors = {
      info: '\x1b[36m',     // Cyan
      success: '\x1b[32m',  // Green
      warning: '\x1b[33m',  // Yellow
      error: '\x1b[31m',    // Red
      reset: '\x1b[0m'      // Reset
    };

    const icon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    console.log(`${colors[type]}[${timestamp}] ${icon[type]} ${message}${colors.reset}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkFileExists(filePath, required = true) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch (error) {
      if (required) {
        this.errors.push(`Missing required file: ${filePath}`);
      } else {
        this.warnings.push(`Optional file not found: ${filePath}`);
      }
      return false;
    }
  }

  async checkDependencies() {
    this.log('Checking dependencies...', 'info');

    const checks = [
      { file: 'package.json', required: true },
      { file: 'package-lock.json', required: false },
      { file: 'bun.lock', required: false },
      { file: 'node_modules', required: true }
    ];

    let allGood = true;

    for (const check of checks) {
      const exists = await this.checkFileExists(check.file, check.required);
      if (check.required && !exists) {
        allGood = false;
      }
    }

    // Check package.json structure
    try {
      const pkg = JSON.parse(await fs.promises.readFile('package.json', 'utf8'));

      const requiredScripts = [
        'benchmark:full',
        'readme:generate',
        'express:node',
        'express:bun',
        'fastify:node',
        'fastify:bun',
        'hono:node',
        'hono:bun'
      ];

      const missingScripts = requiredScripts.filter(script => !pkg.scripts[script]);
      if (missingScripts.length > 0) {
        this.errors.push(`Missing package.json scripts: ${missingScripts.join(', ')}`);
        allGood = false;
      }

      const requiredDeps = ['express', 'fastify', 'hono', '@hono/node-server'];
      const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
      if (missingDeps.length > 0) {
        this.errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        allGood = false;
      }

      const requiredDevDeps = ['autocannon'];
      const missingDevDeps = requiredDevDeps.filter(dep => !pkg.devDependencies[dep]);
      if (missingDevDeps.length > 0) {
        this.errors.push(`Missing dev dependencies: ${missingDevDeps.join(', ')}`);
        allGood = false;
      }

    } catch (error) {
      this.errors.push(`Invalid package.json: ${error.message}`);
      allGood = false;
    }

    // Check Node.js and Bun versions
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        this.warnings.push(`Node.js version ${nodeVersion} is old. Recommend v20+`);
      } else {
        this.log(`Node.js version: ${nodeVersion}`, 'success');
      }
    } catch (error) {
      this.errors.push(`Could not check Node.js version: ${error.message}`);
      allGood = false;
    }

    // Check Bun availability
    try {
      const bunVersion = require('child_process').execSync('bun --version', {
        encoding: 'utf8',
        timeout: 5000
      }).trim();
      this.log(`Bun version: ${bunVersion}`, 'success');
    } catch (error) {
      this.warnings.push('Bun is not available or not in PATH');
    }

    this.results.dependencies = allGood;
    this.log(`Dependencies check: ${allGood ? 'PASSED' : 'FAILED'}`, allGood ? 'success' : 'error');
    return allGood;
  }

  async checkProjectStructure() {
    this.log('Checking project structure...', 'info');

    const requiredFiles = [
      'express_server.js',
      'fastify_server.js',
      'hono_server.js',
      'scripts/benchmark.js',
      'scripts/generate-readme.js',
      '.github/workflows/monthly-benchmark.yml',
      '.github/workflows/pr-benchmark.yml'
    ];

    const optionalFiles = [
      'benchmark_comprehensive.js',
      'benchmark_results.json',
      'CONTRIBUTING.md'
    ];

    let allGood = true;

    for (const file of requiredFiles) {
      if (!(await this.checkFileExists(file, true))) {
        allGood = false;
      }
    }

    for (const file of optionalFiles) {
      await this.checkFileExists(file, false);
    }

    // Check directory structure
    const requiredDirs = ['scripts', '.github/workflows'];
    for (const dir of requiredDirs) {
      try {
        const stat = await fs.promises.stat(dir);
        if (!stat.isDirectory()) {
          this.errors.push(`${dir} exists but is not a directory`);
          allGood = false;
        }
      } catch (error) {
        this.errors.push(`Missing directory: ${dir}`);
        allGood = false;
      }
    }

    this.results.structure = allGood;
    this.log(`Project structure check: ${allGood ? 'PASSED' : 'FAILED'}`, allGood ? 'success' : 'error');
    return allGood;
  }

  async testServerStartup(name, script, port, timeout = 10000) {
    return new Promise((resolve) => {
      this.log(`Testing ${name} server startup...`, 'info');

      const serverProcess = spawn('node', [script], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });

      let started = false;
      let output = '';
      let errorOutput = '';

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      serverProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Give server time to start
      setTimeout(async () => {
        try {
          // Test HTTP connection
          const req = http.request(`http://localhost:${port}`, (res) => {
            if (res.statusCode === 200) {
              this.log(`${name} server: PASSED`, 'success');
              started = true;
            } else {
              this.log(`${name} server returned status ${res.statusCode}`, 'warning');
            }
            serverProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
              }
            }, 1000);
            resolve(started);
          });

          req.on('error', (error) => {
            this.errors.push(`${name} server connection failed: ${error.message}`);
            this.log(`${name} server: FAILED`, 'error');
            serverProcess.kill('SIGTERM');
            setTimeout(() => {
              if (!serverProcess.killed) {
                serverProcess.kill('SIGKILL');
              }
            }, 1000);
            resolve(false);
          });

          req.setTimeout(5000);
          req.end();

        } catch (error) {
          this.errors.push(`${name} server test error: ${error.message}`);
          serverProcess.kill('SIGTERM');
          resolve(false);
        }
      }, 3000);

      // Timeout handling
      setTimeout(() => {
        if (!started) {
          this.errors.push(`${name} server startup timeout`);
          this.log(`${name} server: TIMEOUT`, 'error');
          if (errorOutput) {
            this.log(`${name} error output: ${errorOutput}`, 'error');
          }
          serverProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!serverProcess.killed) {
              serverProcess.kill('SIGKILL');
            }
          }, 1000);
          resolve(false);
        }
      }, timeout);
    });
  }

  async checkServers() {
    this.log('Testing server implementations...', 'info');

    const servers = [
      { name: 'Express', script: 'express_server.js', port: 3000 },
      { name: 'Fastify', script: 'fastify_server.js', port: 3001 },
      { name: 'Hono', script: 'hono_server.js', port: 3002 }
    ];

    let allGood = true;

    for (const server of servers) {
      try {
        const result = await this.testServerStartup(server.name, server.script, server.port);
        if (!result) {
          allGood = false;
        }
        // Wait between server tests
        await this.sleep(2000);
      } catch (error) {
        this.errors.push(`Server test error for ${server.name}: ${error.message}`);
        allGood = false;
      }
    }

    this.results.servers = allGood;
    this.log(`Server tests: ${allGood ? 'PASSED' : 'FAILED'}`, allGood ? 'success' : 'error');
    return allGood;
  }

  async checkBenchmarkScript() {
    this.log('Testing benchmark script...', 'info');

    try {
      // Check if benchmark script can be loaded
      const { BenchmarkRunner } = require('../scripts/benchmark.js');

      if (typeof BenchmarkRunner !== 'function') {
        this.errors.push('BenchmarkRunner is not a constructor function');
        this.results.benchmark = false;
        return false;
      }

      // Try to instantiate
      const benchmark = new BenchmarkRunner();

      if (!benchmark.config || !benchmark.frameworks || !benchmark.runtimes) {
        this.errors.push('BenchmarkRunner missing required properties');
        this.results.benchmark = false;
        return false;
      }

      // Check configuration
      const requiredConfigKeys = ['connections', 'duration', 'runs', 'warmupTime', 'cooldownTime'];
      const missingKeys = requiredConfigKeys.filter(key => !(key in benchmark.config));
      if (missingKeys.length > 0) {
        this.errors.push(`Benchmark config missing keys: ${missingKeys.join(', ')}`);
        this.results.benchmark = false;
        return false;
      }

      // Check frameworks configuration
      for (const framework of benchmark.frameworks) {
        const requiredFrameworkKeys = ['name', 'script', 'port', 'endpoint'];
        const missingFrameworkKeys = requiredFrameworkKeys.filter(key => !(key in framework));
        if (missingFrameworkKeys.length > 0) {
          this.errors.push(`Framework ${framework.name || 'unknown'} missing keys: ${missingFrameworkKeys.join(', ')}`);
          this.results.benchmark = false;
          return false;
        }
      }

      this.log('Benchmark script: PASSED', 'success');
      this.results.benchmark = true;
      return true;

    } catch (error) {
      this.errors.push(`Benchmark script error: ${error.message}`);
      this.log('Benchmark script: FAILED', 'error');
      this.results.benchmark = false;
      return false;
    }
  }

  async checkReadmeGenerator() {
    this.log('Testing README generator...', 'info');

    try {
      const { ReadmeGenerator } = require('../scripts/generate-readme.js');

      if (typeof ReadmeGenerator !== 'function') {
        this.errors.push('ReadmeGenerator is not a constructor function');
        this.results.readme = false;
        return false;
      }

      // Check if we have sample results to test with
      if (await this.checkFileExists('benchmark_results.json', false)) {
        const generator = new ReadmeGenerator('benchmark_results.json');
        const content = generator.generate();

        if (!content) {
          this.errors.push('README generator failed to generate content');
          this.results.readme = false;
          return false;
        }

        // Basic content validation
        const requiredSections = [
          '# Node.js Framework Benchmark',
          '## 🏆 Performance Rankings',
          '## ⚡ Runtime Comparisons',
          '## 🔬 Methodology'
        ];

        const missingSections = requiredSections.filter(section => !content.includes(section));
        if (missingSections.length > 0) {
          this.warnings.push(`README missing sections: ${missingSections.join(', ')}`);
        }

        this.log('README generator: PASSED', 'success');
        this.results.readme = true;
        return true;
      } else {
        this.warnings.push('No benchmark_results.json found - cannot fully test README generator');
        this.results.readme = true;
        return true;
      }

    } catch (error) {
      this.errors.push(`README generator error: ${error.message}`);
      this.log('README generator: FAILED', 'error');
      this.results.readme = false;
      return false;
    }
  }

  async checkWorkflows() {
    this.log('Checking GitHub workflows...', 'info');

    const workflows = [
      '.github/workflows/monthly-benchmark.yml',
      '.github/workflows/pr-benchmark.yml'
    ];

    let allGood = true;

    for (const workflow of workflows) {
      try {
        const content = await fs.promises.readFile(workflow, 'utf8');

        // Basic YAML structure validation
        if (!content.includes('name:') || !content.includes('on:') || !content.includes('jobs:')) {
          this.errors.push(`Invalid workflow structure in ${workflow}`);
          allGood = false;
          continue;
        }

        // Check for required jobs/steps
        if (workflow.includes('monthly-benchmark')) {
          if (!content.includes('benchmark:') || !content.includes('setup-node')) {
            this.errors.push(`Monthly benchmark workflow missing required steps`);
            allGood = false;
          }
        }

        if (workflow.includes('pr-benchmark')) {
          if (!content.includes('pr-benchmark:') || !content.includes('setup-node')) {
            this.errors.push(`PR benchmark workflow missing required steps`);
            allGood = false;
          }
        }

      } catch (error) {
        this.errors.push(`Cannot read workflow ${workflow}: ${error.message}`);
        allGood = false;
      }
    }

    this.results.workflows = allGood;
    this.log(`GitHub workflows: ${allGood ? 'PASSED' : 'FAILED'}`, allGood ? 'success' : 'error');
    return allGood;
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('VALIDATION REPORT', 'info');
    this.log('='.repeat(60), 'info');

    // Summary
    const totalChecks = Object.keys(this.results).length;
    const passedChecks = Object.values(this.results).filter(r => r).length;
    const overallStatus = passedChecks === totalChecks;

    this.log(`\nOverall Status: ${overallStatus ? 'PASSED' : 'FAILED'}`, overallStatus ? 'success' : 'error');
    this.log(`Checks Passed: ${passedChecks}/${totalChecks}`, 'info');

    // Individual results
    this.log('\nDetailed Results:', 'info');
    Object.entries(this.results).forEach(([check, passed]) => {
      const status = passed ? 'PASSED' : 'FAILED';
      const emoji = passed ? '✅' : '❌';
      this.log(`  ${emoji} ${check.padEnd(15)}: ${status}`, passed ? 'success' : 'error');
    });

    // Errors
    if (this.errors.length > 0) {
      this.log('\nErrors Found:', 'error');
      this.errors.forEach((error, index) => {
        this.log(`  ${index + 1}. ${error}`, 'error');
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      this.log('\nWarnings:', 'warning');
      this.warnings.forEach((warning, index) => {
        this.log(`  ${index + 1}. ${warning}`, 'warning');
      });
    }

    // Recommendations
    this.log('\nRecommendations:', 'info');
    if (!this.results.dependencies) {
      this.log('  • Run "npm install" and "bun install" to install dependencies', 'info');
    }
    if (!this.results.servers) {
      this.log('  • Check server implementations for syntax errors', 'info');
      this.log('  • Ensure ports 3000-3002 are available', 'info');
    }
    if (!this.results.benchmark) {
      this.log('  • Check benchmark script for syntax errors', 'info');
      this.log('  • Verify all required dependencies are installed', 'info');
    }
    if (!this.results.readme) {
      this.log('  • Run a benchmark first to generate sample results', 'info');
      this.log('  • Check README generator script for errors', 'info');
    }

    this.log('\nNext Steps:', 'info');
    if (overallStatus) {
      this.log('  🎉 Setup is valid! You can now run:', 'success');
      this.log('    • npm run benchmark:full', 'info');
      this.log('    • npm run readme:generate', 'info');
      this.log('    • npm run dev:benchmark', 'info');
    } else {
      this.log('  🔧 Fix the errors above and run validation again:', 'error');
      this.log('    node scripts/validate-setup.js', 'info');
    }

    this.log('\n' + '='.repeat(60), 'info');

    return overallStatus;
  }

  async validate() {
    this.log('Starting Framework Benchmark Setup Validation...', 'info');
    this.log(`Working directory: ${process.cwd()}`, 'info');
    this.log(`Node.js version: ${process.version}`, 'info');

    try {
      await this.checkDependencies();
      await this.checkProjectStructure();
      await this.checkServers();
      await this.checkBenchmarkScript();
      await this.checkReadmeGenerator();
      await this.checkWorkflows();

      return this.generateReport();

    } catch (error) {
      this.log(`Validation failed with error: ${error.message}`, 'error');
      this.errors.push(`Validation error: ${error.message}`);
      return false;
    }
  }
}

// CLI interface
async function main() {
  const validator = new SetupValidator();

  // Handle command line arguments
  const args = process.argv.slice(2);
  const flags = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    quick: args.includes('--quick') || args.includes('-q'),
    help: args.includes('--help') || args.includes('-h')
  };

  if (flags.help) {
    console.log(`
Framework Benchmark Setup Validator

Usage: node scripts/validate-setup.js [options]

Options:
  -h, --help     Show this help message
  -v, --verbose  Show detailed output
  -q, --quick    Skip server startup tests (faster)

Examples:
  node scripts/validate-setup.js          # Full validation
  node scripts/validate-setup.js --quick  # Skip server tests
  node scripts/validate-setup.js -v       # Verbose output
`);
    process.exit(0);
  }

  if (flags.quick) {
    validator.log('Running quick validation (skipping server tests)', 'warning');
    // Override server check to skip actual startup tests
    validator.checkServers = async function() {
      this.log('Skipping server startup tests (quick mode)', 'warning');
      this.results.servers = true;
      return true;
    };
  }

  const success = await validator.validate();
  process.exit(success ? 0 : 1);
}

// Export for testing
module.exports = { SetupValidator };

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
