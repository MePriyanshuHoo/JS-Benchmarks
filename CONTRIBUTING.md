# Contributing to Framework Benchmark

Thank you for your interest in contributing to the Framework Benchmark project! This guide will help you get started with contributing to our high-performance C++ benchmarking suite.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Adding New Frameworks](#adding-new-frameworks)
- [Performance Guidelines](#performance-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and professional in all interactions.

## Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew dependencies
brew install curl wrk pkg-config node

# Install Bun
curl -fsSL https://bun.sh/install | bash
```

**Ubuntu/Debian:**
```bash
# Install build tools
sudo apt-get update
sudo apt-get install -y build-essential libcurl4-openssl-dev pkg-config

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install WRK
git clone https://github.com/wg/wrk.git /tmp/wrk
cd /tmp/wrk && make && sudo cp wrk /usr/local/bin/

# Install Bun
curl -fsSL https://bun.sh/install | bash
```

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/framework-benchmark.git
cd framework-benchmark

# Install JavaScript dependencies
npm install
bun install

# Verify system dependencies
make check-deps

# Build and test
make clean && make && ./bin/benchmark_wrk
```

## Development Setup

### Environment Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/framework-benchmark.git
   cd framework-benchmark
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-org/framework-benchmark.git
   ```

4. **Install dependencies**:
   ```bash
   make install-deps  # macOS
   # or
   make install-deps-ubuntu  # Ubuntu
   ```

### IDE Configuration

**Visual Studio Code:**
```json
// .vscode/settings.json
{
  "C_Cpp.default.cppStandard": "c++17",
  "C_Cpp.default.includePath": [
    "${workspaceFolder}/**",
    "/opt/homebrew/include",
    "/usr/include"
  ],
  "files.associations": {
    "*.cpp": "cpp",
    "*.h": "cpp"
  }
}
```

**CLion/IntelliJ:**
- Set C++ standard to C++17
- Configure CMake if needed
- Add include paths for system libraries

## Project Structure

```
framework-benchmark/
├── benchmark_wrk.cpp          # Main C++ benchmark implementation
├── Makefile                   # Build system
├── package.json               # Node.js dependencies
├── express_server.js          # Express framework server
├── fastify_server.js          # Fastify framework server
├── hono_server.js             # Hono framework server
├── .github/workflows/         # CI/CD workflows
│   ├── monthly-benchmark.yml
│   ├── pr-benchmark.yml
│   └── test-setup.yml
└── README.md                  # Project documentation
```

## Making Changes

### Branching Strategy

- `main` - Production-ready code
- `feature/description` - New features
- `fix/description` - Bug fixes
- `perf/description` - Performance improvements
- `docs/description` - Documentation updates

### Code Standards

#### C++ Guidelines

**Style:**
```cpp
// Use descriptive names
class BenchmarkOrchestrator {
private:
    BenchmarkConfig config;
    std::vector<Setup> setups;
    
public:
    // Clear, documented methods
    bool runBenchmark(const Setup& setup);
    void generateReport(const std::vector<Result>& results);
};

// Use const correctness
const std::string& getName() const { return name; }

// RAII for resource management
class ServerManager {
    pid_t serverPid;
public:
    ServerManager(const Setup& setup) : serverPid(startServer(setup)) {}
    ~ServerManager() { stopServer(serverPid); }
};
```

**Formatting:**
- 4 spaces for indentation
- Opening braces on same line
- Clear variable and function names
- Comments for complex algorithms

**Error Handling:**
```cpp
// Use exceptions for exceptional cases
if (!serverReady) {
    throw std::runtime_error("Server failed to start on port " + std::to_string(port));
}

// Use return codes for expected failures
bool checkServerHealth(int port) {
    // Returns false on failure, not exception
    return healthy;
}
```

#### JavaScript Guidelines

For framework servers, follow these patterns:

**Express:**
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express!', timestamp: Date.now() });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Express server listening on port 3000');
});
```

**Error Handling:**
```javascript
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully');
  server.close(() => process.exit(0));
});
```

### Build System Guidelines

**Makefile Best Practices:**
- Use `.PHONY` for non-file targets
- Provide help target
- Support both debug and release builds
- Handle cross-platform differences

```makefile
.PHONY: all clean help

# Default target
all: $(TARGET)

# Help target
help:
	@echo "Available targets:"
	@echo "  all      - Build benchmark"
	@echo "  clean    - Clean build files"
	@echo "  debug    - Build with debug info"
```

## Testing

### Running Tests

**Quick Validation:**
```bash
# Test compilation
make test-compile

# Test individual components
make clean && make debug
./bin/benchmark_wrk

# Test specific framework
node express_server.js &
curl http://localhost:3000
pkill -f express_server.js
```

**Full Test Suite:**
```bash
# Run comprehensive tests
make clean && make release && make run
```

### Adding Tests

**Unit Testing (for new components):**
```cpp
// test_benchmark.cpp
#include "benchmark_wrk.h"
#include <cassert>

void test_parseWrkOutput() {
    std::string mockOutput = "Requests/sec: 12345.67\n";
    BenchmarkResult result = parseWrkOutput(mockOutput);
    assert(result.requestsPerSecond == 12345.67);
}

int main() {
    test_parseWrkOutput();
    std::cout << "All tests passed!" << std::endl;
    return 0;
}
```

**Integration Testing:**
```bash
# Create test configuration
echo '{"connections": 10, "duration": "2s"}' > test_config.json

# Run with test config
./bin/benchmark_wrk --config test_config.json
```

### Performance Testing

**Benchmark Validation:**
- Ensure consistent results across runs
- Verify no memory leaks
- Test under different system loads
- Validate statistical accuracy

```bash
# Memory leak testing (if available)
valgrind --leak-check=full ./bin/benchmark_wrk

# Performance profiling
perf record ./bin/benchmark_wrk
perf report
```

## Submitting Changes

### Pull Request Process

1. **Update your fork:**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-description
   ```

3. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add new framework support for Koa.js"
   ```

4. **Push and create PR:**
   ```bash
   git push origin feature/your-description
   ```

### Commit Message Format

Use conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat` - New features
- `fix` - Bug fixes
- `perf` - Performance improvements
- `docs` - Documentation
- `test` - Tests
- `refactor` - Code refactoring
- `style` - Code style changes
- `ci` - CI/CD changes

**Examples:**
```
feat(benchmark): add support for Deno runtime

perf(wrk): optimize result parsing with regex caching

fix(server): handle SIGTERM gracefully in Express server

docs(readme): update installation instructions for Ubuntu 22.04
```

### PR Requirements

**Before submitting:**
- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No unnecessary files included

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] All CI checks pass
- [ ] Performance impact verified

## Performance Impact
- Baseline: X req/sec
- After changes: Y req/sec
- Impact: +/- Z%

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
```

## Adding New Frameworks

### Framework Integration Steps

1. **Create server file:**
   ```javascript
   // newframework_server.js
   const NewFramework = require('new-framework');
   
   const app = new NewFramework();
   
   app.get('/', (req, res) => {
     res.json({ 
       message: 'Hello from NewFramework!', 
       timestamp: Date.now() 
     });
   });
   
   app.listen(3003, '0.0.0.0', () => {
     console.log('NewFramework server listening on port 3003');
   });
   ```

2. **Update C++ configuration:**
   ```cpp
   // In benchmark_wrk.cpp constructor
   setups = {
       // ... existing frameworks
       {"NewFramework on Node.js", 3003, "node", "newframework", "newframework_server.js"},
       {"NewFramework on Bun", 3003, "bun", "newframework", "newframework_server.js"}
   };
   ```

3. **Update package.json:**
   ```json
   {
     "dependencies": {
       "new-framework": "^1.0.0"
     },
     "scripts": {
       "newframework:node": "node newframework_server.js",
       "newframework:bun": "bun newframework_server.js"
     }
   }
   ```

4. **Test integration:**
   ```bash
   npm install
   make clean && make
   npm run newframework:node &
   curl http://localhost:3003
   ```

### Framework Requirements

**Server Implementation:**
- Listen on specified port with `0.0.0.0` binding
- Return JSON response with consistent structure
- Handle graceful shutdown (SIGTERM)
- No additional middleware that affects performance
- Production-ready configuration

**Response Format:**
```json
{
  "message": "Hello from FrameworkName!",
  "timestamp": 1234567890
}
```

## Performance Guidelines

### Optimization Principles

1. **Minimize Overhead:**
   - Use efficient algorithms
   - Avoid unnecessary allocations
   - Cache frequently used data

2. **Statistical Accuracy:**
   - Multiple test runs
   - Proper warmup periods
   - Standard deviation calculation

3. **Fair Testing:**
   - Consistent test conditions
   - Equivalent server implementations
   - Same hardware/software environment

### Benchmarking Best Practices

**Configuration:**
```cpp
// Use reasonable defaults
const BENCHMARK_CONFIG = {
    connections: 100,      // Realistic load
    duration: "30s",       // Sufficient duration
    runs: 3,              // Multiple runs for accuracy
    warmupTime: 3000,     // Allow server warmup
    cooldownTime: 2000    // Clean shutdown
};
```

**Measurement:**
- Focus on requests per second as primary metric
- Include latency percentiles (P50, P90, P99)
- Monitor for errors and timeouts
- Track memory usage for long tests

## Documentation

### Code Documentation

**C++ Documentation:**
```cpp
/**
 * @brief Runs a complete benchmark suite across all configured frameworks
 * 
 * This method orchestrates the entire benchmarking process:
 * 1. Starts each framework server
 * 2. Runs WRK load tests
 * 3. Collects and analyzes results
 * 4. Generates comprehensive reports
 * 
 * @param config Benchmark configuration parameters
 * @return true if all benchmarks completed successfully
 * @throws std::runtime_error if critical components fail
 */
bool runAllBenchmarks(const BenchmarkConfig& config);
```

**README Updates:**
- Update performance results
- Document new frameworks
- Include troubleshooting steps
- Maintain installation instructions

## Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **PR Reviews**: For code feedback

### Reporting Issues

**Bug Report Template:**
```markdown
## Bug Description
Clear description of the issue

## Environment
- OS: macOS/Ubuntu/Windows
- Compiler: GCC/Clang version
- Node.js version:
- Bun version:
- WRK version:

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Additional Context
Any other relevant information
```

### Performance Issues

**Performance Report Template:**
```markdown
## Performance Issue
Description of performance degradation

## Benchmark Results
- Before: X req/sec
- After: Y req/sec
- Regression: Z%

## System Information
- Hardware specs
- Load conditions
- Other running processes

## Profiling Data
Include profiling output if available
```

## Release Process

### Version Management

**Semantic Versioning:**
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes

**Release Steps:**
1. Update version in package.json
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Create GitHub release
6. Update documentation

---

Thank you for contributing to the Framework Benchmark project! Your contributions help make web framework performance analysis more accurate and accessible to the community.