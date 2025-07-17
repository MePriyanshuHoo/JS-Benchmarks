# Contributing to Framework Benchmark

Thank you for your interest in contributing to the Framework Benchmark project! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Adding New Frameworks](#adding-new-frameworks)
- [Improving Benchmarks](#improving-benchmarks)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Automated Systems](#automated-systems)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Getting Started

### Prerequisites

- **Node.js** (v20 or higher)
- **Bun** (latest version)
- **Git**
- **Basic understanding** of JavaScript and web frameworks

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/framework-benchmark.git
   cd framework-benchmark
   ```

2. **Install Dependencies**
   ```bash
   npm install
   bun install
   ```

3. **Verify Setup**
   ```bash
   npm run test:servers
   npm run benchmark:full
   ```

4. **Run Development Benchmark**
   ```bash
   npm run dev:benchmark
   ```

## Adding New Frameworks

### Step-by-Step Guide

1. **Create Server Implementation**

   Create a new file `{framework}_server.js` in the project root:

   ```javascript
   // Example: newframework_server.js
   const newframework = require('newframework');
   
   const app = newframework();
   
   app.get('/', (req, res) => {
     res.json({ message: 'Hello from NewFramework!' });
   });
   
   app.listen(3003, () => {
     console.log('NewFramework server running on port 3003');
   });
   ```

2. **Update Benchmark Configuration**

   Add your framework to `scripts/benchmark.js`:

   ```javascript
   this.frameworks = [
     // ... existing frameworks
     {
       name: 'NewFramework',
       script: 'newframework_server.js',
       port: 3003,
       endpoint: '/',
       responseType: 'json'
     }
   ];
   ```

3. **Add Package Scripts**

   Update `package.json`:

   ```json
   {
     "scripts": {
       "newframework:node": "node newframework_server.js",
       "newframework:bun": "bun newframework_server.js"
     },
     "dependencies": {
       "newframework": "^1.0.0"
     }
   }
   ```

4. **Test Your Implementation**

   ```bash
   npm run newframework:node
   # In another terminal:
   curl http://localhost:3003
   ```

### Framework Requirements

- **Consistent Response Format**: Use either JSON `{"message": "Hello from Framework!"}` or plain text
- **Production Optimization**: Configure for production performance
- **Minimal Middleware**: Avoid unnecessary middleware that could skew results
- **Error Handling**: Implement basic error handling
- **Clean Shutdown**: Support graceful shutdown

### Framework Guidelines

- **Port Assignment**: Use the next available port (check existing frameworks)
- **Logging**: Disable or minimize logging in production mode
- **Process Title**: Set meaningful process title for easy identification
- **Environment Variables**: Respect `NODE_ENV` and `PORT` environment variables

## Improving Benchmarks

### Benchmark Enhancements

1. **New Metrics**
   
   Add metrics to `BenchmarkRunner.calculateStats()`:

   ```javascript
   // Example: Memory usage tracking
   const memoryUsage = process.memoryUsage();
   stats.memory = {
     heapUsed: memoryUsage.heapUsed,
     heapTotal: memoryUsage.heapTotal,
     external: memoryUsage.external
   };
   ```

2. **Test Scenarios**

   Create specialized benchmark scenarios:

   ```javascript
   // scripts/benchmark-scenarios.js
   class ScenarioBenchmark extends BenchmarkRunner {
     async runFileUploadTest() {
       // Implementation for file upload performance
     }
     
     async runDatabaseLoadTest() {
       // Implementation for database-heavy scenarios
     }
   }
   ```

3. **Platform Support**

   Add support for different platforms:

   ```javascript
   async getSystemInfo() {
     // Add Windows, Linux-specific optimizations
     if (process.platform === 'win32') {
       // Windows-specific system info
     }
   }
   ```

### Performance Analysis

- **Statistical Accuracy**: Ensure sufficient sample sizes
- **Environment Consistency**: Minimize external factors
- **Resource Monitoring**: Track CPU, memory, network usage
- **Baseline Comparison**: Compare against previous results

## Code Style Guidelines

### JavaScript Style

- **ES6+**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over promises chains
- **Error Handling**: Always handle errors appropriately
- **Comments**: Document complex logic and benchmark decisions

### File Organization

```
framework-benchmark/
├── scripts/           # Benchmark and utility scripts
├── data/             # Historical and result data
├── .github/          # GitHub workflows and templates
├── {framework}_server.js  # Individual framework servers
└── README.md         # Auto-generated documentation
```

### Naming Conventions

- **Files**: Use `kebab-case` for scripts, `snake_case` for servers
- **Variables**: Use `camelCase`
- **Constants**: Use `UPPER_SNAKE_CASE`
- **Functions**: Use descriptive names with verbs

### Documentation

- **JSDoc**: Document public functions and classes
- **README Updates**: Ensure README generation captures new features
- **Inline Comments**: Explain benchmark methodology decisions

## Testing

### Server Testing

```bash
# Test individual servers
npm run test:servers

# Test with different runtimes
node {framework}_server.js
bun {framework}_server.js
```

### Benchmark Testing

```bash
# Quick validation
npm run dev:benchmark

# Full benchmark suite
npm run benchmark:full

# Light benchmark for CI
node scripts/light-benchmark.js
```

### Automated Testing

```bash
# Lint code
npm run lint

# Run all tests
npm test

# Validate benchmark results
node scripts/validate-results.js
```

## Automated Systems

### GitHub Workflows

1. **Monthly Benchmark** (`.github/workflows/monthly-benchmark.yml`)
   - Runs on the 1st of each month
   - Tests all frameworks across Node.js versions
   - Updates README automatically
   - Archives historical data

2. **PR Benchmark** (`.github/workflows/pr-benchmark.yml`)
   - Runs on pull requests affecting servers or benchmarks
   - Provides performance validation
   - Comments results on PRs

### README Generation

The README is automatically generated from benchmark results:

```bash
# Generate README from latest results
npm run readme:generate

# Custom results file
node scripts/generate-readme.js custom_results.json
```

### Historical Data

- **Location**: `data/historical/YYYY/`
- **Format**: JSON with timestamp and metadata
- **Retention**: All historical data is preserved
- **Analysis**: Used for trend analysis and regression detection

## Pull Request Process

### Before Submitting

1. **Test Locally**
   ```bash
   npm run dev:benchmark
   npm run test:servers
   ```

2. **Validate Changes**
   ```bash
   node scripts/validate-benchmark.js
   ```

3. **Update Documentation**
   - Update relevant comments
   - Ensure README generation works
   - Add any new dependencies

### PR Guidelines

- **Single Responsibility**: One feature/fix per PR
- **Clear Description**: Explain what and why
- **Performance Impact**: Document expected performance changes
- **Backward Compatibility**: Ensure existing benchmarks still work

### PR Template

```markdown
## Changes
- [ ] Added new framework
- [ ] Improved benchmark methodology
- [ ] Fixed bug in existing code
- [ ] Updated documentation

## Framework Details (if applicable)
- **Name**: 
- **Version**: 
- **Type**: (web framework, runtime, etc.)

## Performance Impact
- Expected change in benchmark results
- Reason for performance change

## Testing
- [ ] Tested locally with `npm run dev:benchmark`
- [ ] Verified server startup with `npm run test:servers`
- [ ] Checked README generation works
```

### Review Process

1. **Automated Checks**: GitHub Actions will run benchmarks
2. **Code Review**: Maintainers review implementation
3. **Performance Review**: Validate benchmark methodology
4. **Documentation Review**: Ensure proper documentation

## Release Process

### Version Numbering

- **Major**: Significant methodology changes or breaking changes
- **Minor**: New frameworks or features
- **Patch**: Bug fixes and small improvements

### Release Checklist

1. **Update Version**: Bump version in `package.json`
2. **Generate Changelog**: Document all changes
3. **Run Full Benchmark**: Ensure everything works
4. **Update README**: Regenerate with latest results
5. **Tag Release**: Create Git tag with version
6. **Archive Data**: Ensure historical data is preserved

### Deployment

Releases are automatically deployed through GitHub Actions:

1. **Tag Creation**: Triggers release workflow
2. **Benchmark Execution**: Runs complete benchmark suite
3. **Documentation Update**: Updates README and documentation
4. **Archive Creation**: Creates downloadable release artifacts

## Best Practices

### Performance Testing

- **Consistent Environment**: Use similar hardware and software configurations
- **Sufficient Duration**: Allow enough time for meaningful results
- **Multiple Runs**: Average results across multiple iterations
- **Baseline Comparison**: Always compare against previous versions

### Framework Implementation

- **Minimal Configuration**: Keep server implementations simple and focused
- **Production Settings**: Use production-optimized configurations
- **Resource Efficiency**: Avoid memory leaks and resource waste
- **Standard Responses**: Use consistent response formats

### Documentation

- **Clear Explanations**: Document methodology and reasoning
- **Reproducible Results**: Provide enough detail for reproduction
- **Regular Updates**: Keep documentation current with code changes
- **Performance Context**: Explain what the results mean

## Getting Help

### Resources

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and share ideas
- **Wiki**: Detailed technical documentation
- **Examples**: Reference implementations in the repository

### Community

- **Code of Conduct**: Be respectful and constructive
- **Help Others**: Share knowledge and assist new contributors
- **Feedback**: Provide thoughtful code reviews
- **Documentation**: Help improve and maintain documentation

### Contact

- **Issues**: Use GitHub Issues for bugs and feature requests
- **Security**: Report security issues privately to maintainers
- **General**: Use GitHub Discussions for questions and ideas

---

Thank you for contributing to the Framework Benchmark project! Your contributions help the entire JavaScript community make informed decisions about framework performance.