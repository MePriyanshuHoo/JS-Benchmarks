# Makefile for Framework Benchmark C++ Implementation

# Compiler and flags
CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -O2 -pthread
LDFLAGS = -lcurl

# Directories
SRC_DIR = .
BUILD_DIR = build
BIN_DIR = bin

# Source files
SOURCES = benchmark_wrk.cpp
OBJECTS = $(SOURCES:%.cpp=$(BUILD_DIR)/%.o)
TARGET = $(BIN_DIR)/benchmark_wrk

# Default target
.PHONY: all
all: $(TARGET)

# Create directories
$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

# Compile object files
$(BUILD_DIR)/%.o: $(SRC_DIR)/%.cpp | $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Link executable
$(TARGET): $(OBJECTS) | $(BIN_DIR)
	$(CXX) $(OBJECTS) $(LDFLAGS) -o $@

# Install dependencies (macOS with Homebrew)
.PHONY: install-deps
install-deps:
	@echo "Installing dependencies..."
	@if command -v brew >/dev/null 2>&1; then \
		echo "Installing curl via Homebrew..."; \
		brew install curl; \
		brew install wrk; \
	else \
		echo "Homebrew not found. Please install manually:"; \
		echo "- libcurl development headers"; \
		echo "- wrk load testing tool"; \
	fi

# Install dependencies (Ubuntu/Debian)
.PHONY: install-deps-ubuntu
install-deps-ubuntu:
	@echo "Installing dependencies for Ubuntu/Debian..."
	sudo apt-get update
	sudo apt-get install -y libcurl4-openssl-dev build-essential
	@echo "Installing wrk..."
	@if ! command -v wrk >/dev/null 2>&1; then \
		git clone https://github.com/wg/wrk.git /tmp/wrk; \
		cd /tmp/wrk && make && sudo cp wrk /usr/local/bin/; \
		rm -rf /tmp/wrk; \
	fi

# Check dependencies
.PHONY: check-deps
check-deps:
	@echo "Checking dependencies..."
	@command -v $(CXX) >/dev/null 2>&1 || (echo "Error: $(CXX) not found" && exit 1)
	@pkg-config --exists libcurl || (echo "Error: libcurl not found" && exit 1)
	@command -v wrk >/dev/null 2>&1 || (echo "Error: wrk not found" && exit 1)
	@echo "All dependencies satisfied!"

# Build and run
.PHONY: run
run: $(TARGET)
	./$(TARGET)

# Clean build files
.PHONY: clean
clean:
	rm -rf $(BUILD_DIR) $(BIN_DIR)

# Clean all generated files
.PHONY: clean-all
clean-all: clean
	rm -f benchmark_results_wrk.json
	rm -f benchmark_results_wrk.csv
	rm -f *.log

# Debug build
.PHONY: debug
debug: CXXFLAGS += -g -DDEBUG
debug: $(TARGET)

# Release build (optimized)
.PHONY: release
release: CXXFLAGS += -O3 -DNDEBUG
release: $(TARGET)

# Test compilation without running
.PHONY: test-compile
test-compile: $(TARGET)
	@echo "Compilation successful!"

# Setup development environment
.PHONY: setup
setup: install-deps check-deps
	@echo "Development environment setup complete!"

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  all            - Build the benchmark executable (default)"
	@echo "  run            - Build and run the benchmark"
	@echo "  debug          - Build with debug symbols"
	@echo "  release        - Build optimized release version"
	@echo "  clean          - Remove build files"
	@echo "  clean-all      - Remove all generated files"
	@echo "  install-deps   - Install dependencies (macOS with Homebrew)"
	@echo "  install-deps-ubuntu - Install dependencies (Ubuntu/Debian)"
	@echo "  check-deps     - Check if all dependencies are installed"
	@echo "  setup          - Setup development environment"
	@echo "  test-compile   - Test compilation without running"
	@echo "  help           - Show this help message"

# Conditional compilation based on OS
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    CXXFLAGS += -DLINUX
endif
ifeq ($(UNAME_S),Darwin)
    CXXFLAGS += -DMACOS
    # macOS specific flags if needed
    LDFLAGS += -L/opt/homebrew/lib
    CXXFLAGS += -I/opt/homebrew/include
endif

# Print variables for debugging
.PHONY: print-vars
print-vars:
	@echo "CXX: $(CXX)"
	@echo "CXXFLAGS: $(CXXFLAGS)"
	@echo "LDFLAGS: $(LDFLAGS)"
	@echo "SOURCES: $(SOURCES)"
	@echo "OBJECTS: $(OBJECTS)"
	@echo "TARGET: $(TARGET)"
	@echo "UNAME_S: $(UNAME_S)"
