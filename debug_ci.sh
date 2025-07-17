#!/bin/bash

# CI Debug Script for Framework Benchmark C++ Implementation
# This script helps troubleshoot GitHub Actions and local environment issues

set -e  # Exit on any error
trap 'echo "❌ Script failed at line $LINENO"' ERR

echo "🔍 Framework Benchmark CI Debug Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# System Information
echo "🖥️  SYSTEM INFORMATION"
echo "===================="
log_info "Operating System: $(uname -s)"
log_info "Architecture: $(uname -m)"
log_info "Kernel: $(uname -r)"
log_info "Date: $(date)"

if [ -f /etc/os-release ]; then
    log_info "Distribution: $(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\"')"
fi

if command -v lscpu >/dev/null 2>&1; then
    log_info "CPU Info: $(lscpu | grep 'Model name' | cut -d: -f2 | xargs)"
fi

echo ""

# Package Manager Detection
echo "📦 PACKAGE MANAGER DETECTION"
echo "=========================="
if command -v apt-get >/dev/null 2>&1; then
    log_success "APT package manager detected (Ubuntu/Debian)"
    PKG_MANAGER="apt"
elif command -v brew >/dev/null 2>&1; then
    log_success "Homebrew package manager detected (macOS)"
    PKG_MANAGER="brew"
elif command -v yum >/dev/null 2>&1; then
    log_success "YUM package manager detected (RHEL/CentOS)"
    PKG_MANAGER="yum"
else
    log_warning "No recognized package manager found"
    PKG_MANAGER="unknown"
fi
echo ""

# Build Tools Check
echo "🔨 BUILD TOOLS CHECK"
echo "==================="

# GCC Check
if command -v gcc >/dev/null 2>&1; then
    GCC_VERSION=$(gcc --version | head -1)
    log_success "GCC found: $GCC_VERSION"
else
    log_error "GCC not found"
fi

# G++ Check
if command -v g++ >/dev/null 2>&1; then
    GPP_VERSION=$(g++ --version | head -1)
    log_success "G++ found: $GPP_VERSION"
else
    log_error "G++ not found"
fi

# Clang Check
if command -v clang++ >/dev/null 2>&1; then
    CLANG_VERSION=$(clang++ --version | head -1)
    log_success "Clang++ found: $CLANG_VERSION"
else
    log_warning "Clang++ not found"
fi

# Make Check
if command -v make >/dev/null 2>&1; then
    MAKE_VERSION=$(make --version | head -1)
    log_success "Make found: $MAKE_VERSION"
else
    log_error "Make not found"
fi

# pkg-config Check
if command -v pkg-config >/dev/null 2>&1; then
    PKG_CONFIG_VERSION=$(pkg-config --version)
    log_success "pkg-config found: $PKG_CONFIG_VERSION"
else
    log_error "pkg-config not found"
fi

echo ""

# Library Dependencies Check
echo "📚 LIBRARY DEPENDENCIES CHECK"
echo "=========================="

# libcurl Check
if pkg-config --exists libcurl 2>/dev/null; then
    CURL_VERSION=$(pkg-config --modversion libcurl)
    log_success "libcurl found via pkg-config: $CURL_VERSION"
elif [ -f "/usr/include/curl/curl.h" ]; then
    log_success "libcurl headers found in /usr/include/curl/"
elif [ -f "/opt/homebrew/include/curl/curl.h" ]; then
    log_success "libcurl headers found in /opt/homebrew/include/curl/"
elif [ -f "/usr/local/include/curl/curl.h" ]; then
    log_success "libcurl headers found in /usr/local/include/curl/"
else
    log_error "libcurl development headers not found"
    if [ "$PKG_MANAGER" = "apt" ]; then
        log_info "Install with: sudo apt-get install libcurl4-openssl-dev"
    elif [ "$PKG_MANAGER" = "brew" ]; then
        log_info "Install with: brew install curl"
    fi
fi

# Additional utility checks
if command -v curl >/dev/null 2>&1; then
    CURL_CLIENT_VERSION=$(curl --version | head -1)
    log_success "curl client found: $CURL_CLIENT_VERSION"
else
    log_warning "curl client not found"
fi

if command -v bc >/dev/null 2>&1; then
    log_success "bc (calculator) found"
else
    log_warning "bc (calculator) not found"
fi

echo ""

# WRK Installation Check
echo "⚡ WRK LOAD TESTING TOOL CHECK"
echo "=========================="

if command -v wrk >/dev/null 2>&1; then
    WRK_VERSION=$(wrk --version 2>&1 | head -1)
    log_success "WRK found: $WRK_VERSION"

    # Test WRK functionality
    log_info "Testing WRK functionality..."
    if timeout 5s wrk -c1 -d1s -t1 http://httpbin.org/get >/dev/null 2>&1; then
        log_success "WRK functional test passed"
    else
        log_warning "WRK functional test failed (network issue or httpbin unavailable)"
    fi
else
    log_error "WRK not found"
    if [ "$PKG_MANAGER" = "apt" ]; then
        log_info "Install with: git clone https://github.com/wg/wrk.git && cd wrk && make && sudo cp wrk /usr/local/bin/"
    elif [ "$PKG_MANAGER" = "brew" ]; then
        log_info "Install with: brew install wrk"
    fi
fi

echo ""

# Node.js Runtime Check
echo "🟢 NODE.JS RUNTIME CHECK"
echo "====================="

if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_success "Node.js found: $NODE_VERSION"

    # Check Node.js version compatibility
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        log_success "Node.js version is compatible (>= 18)"
    else
        log_warning "Node.js version may be too old (< 18)"
    fi
else
    log_error "Node.js not found"
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    log_success "npm found: $NPM_VERSION"
else
    log_warning "npm not found"
fi

echo ""

# Bun Runtime Check
echo "🟡 BUN RUNTIME CHECK"
echo "=================="

if command -v bun >/dev/null 2>&1; then
    BUN_VERSION=$(bun --version)
    log_success "Bun found: $BUN_VERSION"
else
    log_warning "Bun not found"
    log_info "Install with: curl -fsSL https://bun.sh/install | bash"
fi

echo ""

# Project Structure Check
echo "📁 PROJECT STRUCTURE CHECK"
echo "======================="

REQUIRED_FILES=(
    "benchmark_wrk.cpp"
    "Makefile"
    "package.json"
    "express_server.js"
    "fastify_server.js"
    "hono_server.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Required file found: $file"
    else
        log_error "Required file missing: $file"
    fi
done

if [ -d "node_modules" ]; then
    log_success "node_modules directory exists"
else
    log_warning "node_modules directory not found"
    log_info "Run: npm install"
fi

echo ""

# Dependencies Installation Check
echo "📦 JAVASCRIPT DEPENDENCIES CHECK"
echo "==============================="

if [ -f "package.json" ]; then
    log_info "Checking package.json dependencies..."

    # Check if dependencies are installed
    if [ -d "node_modules" ]; then
        if [ -d "node_modules/express" ]; then
            log_success "Express dependency installed"
        else
            log_error "Express dependency missing"
        fi

        if [ -d "node_modules/fastify" ]; then
            log_success "Fastify dependency installed"
        else
            log_error "Fastify dependency missing"
        fi

        if [ -d "node_modules/hono" ]; then
            log_success "Hono dependency installed"
        else
            log_error "Hono dependency missing"
        fi
    else
        log_warning "node_modules not found, dependencies not installed"
    fi
else
    log_error "package.json not found"
fi

echo ""

# Compilation Test
echo "🔨 C++ COMPILATION TEST"
echo "====================="

if [ -f "Makefile" ]; then
    log_info "Testing Makefile dependency check..."
    if make check-deps 2>/dev/null; then
        log_success "Makefile dependency check passed"
    else
        log_error "Makefile dependency check failed"
    fi

    log_info "Testing C++ compilation..."
    if make clean >/dev/null 2>&1 && make test-compile >/dev/null 2>&1; then
        log_success "C++ compilation successful"

        if [ -f "bin/benchmark_wrk" ]; then
            log_success "Binary created: bin/benchmark_wrk"

            # Test binary execution
            if ./bin/benchmark_wrk --help >/dev/null 2>&1 || true; then
                log_success "Binary appears to be executable"
            else
                log_warning "Binary may have execution issues"
            fi
        else
            log_error "Binary not created after compilation"
        fi
    else
        log_error "C++ compilation failed"
        log_info "Check compiler and library installations"
    fi
else
    log_error "Makefile not found"
fi

echo ""

# Server Startup Test
echo "🌐 FRAMEWORK SERVER STARTUP TEST"
echo "==============================="

test_server() {
    local server_file=$1
    local port=$2
    local name=$3

    log_info "Testing $name server startup..."

    if [ ! -f "$server_file" ]; then
        log_error "$server_file not found"
        return 1
    fi

    # Start server in background
    node "$server_file" &
    SERVER_PID=$!

    # Wait for startup
    sleep 3

    # Test if server responds
    if curl -f "http://localhost:$port" >/dev/null 2>&1; then
        log_success "$name server started successfully on port $port"
        SERVER_SUCCESS=true
    else
        log_error "$name server failed to start or respond on port $port"
        SERVER_SUCCESS=false
    fi

    # Cleanup
    kill $SERVER_PID 2>/dev/null || true
    sleep 1

    return $([[ $SERVER_SUCCESS == true ]] && echo 0 || echo 1)
}

# Only test servers if Node.js is available
if command -v node >/dev/null 2>&1 && [ -d "node_modules" ]; then
    test_server "express_server.js" 3000 "Express"
    test_server "fastify_server.js" 3001 "Fastify"
    test_server "hono_server.js" 3002 "Hono"
else
    log_warning "Skipping server tests - Node.js or dependencies not available"
fi

echo ""

# Environment Summary
echo "📋 ENVIRONMENT SUMMARY"
echo "===================="

log_info "Summary of critical components:"
echo ""

# Critical components check
components=(
    "C++ Compiler:$(command -v g++ >/dev/null 2>&1 && echo " ✅ Available" || echo " ❌ Missing")"
    "Make Build Tool:$(command -v make >/dev/null 2>&1 && echo " ✅ Available" || echo " ❌ Missing")"
    "libcurl Library:$(pkg-config --exists libcurl 2>/dev/null && echo " ✅ Available" || echo " ❌ Missing")"
    "WRK Load Tester:$(command -v wrk >/dev/null 2>&1 && echo " ✅ Available" || echo " ❌ Missing")"
    "Node.js Runtime:$(command -v node >/dev/null 2>&1 && echo " ✅ Available" || echo " ❌ Missing")"
    "Project Files:$([ -f "benchmark_wrk.cpp" ] && [ -f "Makefile" ] && echo " ✅ Available" || echo " ❌ Missing")"
)

for component in "${components[@]}"; do
    echo "  $component"
done

echo ""

# Installation recommendations
echo "🛠️  INSTALLATION RECOMMENDATIONS"
echo "==============================="

if [ "$PKG_MANAGER" = "apt" ]; then
    echo "For Ubuntu/Debian systems:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y build-essential libcurl4-openssl-dev pkg-config curl bc"
    echo "  # Install WRK:"
    echo "  git clone https://github.com/wg/wrk.git /tmp/wrk"
    echo "  cd /tmp/wrk && make && sudo cp wrk /usr/local/bin/"
    echo "  # Install Node.js:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
elif [ "$PKG_MANAGER" = "brew" ]; then
    echo "For macOS systems:"
    echo "  brew install gcc curl wrk pkg-config bc node"
    echo "  # Install Bun:"
    echo "  curl -fsSL https://bun.sh/install | bash"
else
    echo "Package manager not recognized. Please install manually:"
    echo "  - C++ compiler (gcc/g++ or clang++)"
    echo "  - libcurl development headers"
    echo "  - pkg-config"
    echo "  - WRK load testing tool"
    echo "  - Node.js runtime"
fi

echo ""
echo "🏁 Debug script completed!"
echo ""

# Final status
if command -v g++ >/dev/null 2>&1 && \
   command -v make >/dev/null 2>&1 && \
   command -v wrk >/dev/null 2>&1 && \
   command -v node >/dev/null 2>&1 && \
   [ -f "benchmark_wrk.cpp" ] && \
   [ -f "Makefile" ]; then
    log_success "Environment appears ready for benchmark compilation and execution!"
    echo "Run: make clean && make run"
else
    log_warning "Environment needs additional setup before benchmarking"
    echo "Please address the missing components listed above."
fi
