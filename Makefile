# Makefile for Framework Benchmark C++ Implementation

# Compiler and flags with fallback detection
CXX ?= $(shell command -v g++ 2>/dev/null || command -v clang++ 2>/dev/null || echo "g++")
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
	@echo "Compiling $<..."
	$(CXX) $(CXXFLAGS) -c $< -o $@

# Link executable
$(TARGET): $(OBJECTS) | $(BIN_DIR)
	@echo "Linking $(TARGET)..."
	$(CXX) $(OBJECTS) $(LDFLAGS) -o $@
	@echo "✅ Build completed successfully: $(TARGET)"

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
	@if ! command -v $(CXX) >/dev/null 2>&1; then \
		echo "Warning: $(CXX) not found, trying alternatives..."; \
		if command -v g++ >/dev/null 2>&1; then \
			echo "Found g++, will use that"; \
		elif command -v clang++ >/dev/null 2>&1; then \
			echo "Found clang++, will use that"; \
		else \
			echo "Error: No C++ compiler found (tried g++, clang++)"; \
			exit 1; \
		fi; \
	else \
		echo "✅ C++ compiler: $(CXX)"; \
	fi
	@if pkg-config --exists libcurl 2>/dev/null; then \
		echo "✅ libcurl found"; \
	else \
		echo "Warning: libcurl not found via pkg-config, trying manual detection..."; \
		if [ -f "/usr/include/curl/curl.h" ] || [ -f "/opt/homebrew/include/curl/curl.h" ] || [ -f "/usr/local/include/curl/curl.h" ]; then \
			echo "✅ libcurl headers found manually"; \
		else \
			echo "Error: libcurl development headers not found"; \
			echo "Ubuntu/Debian: sudo apt-get install libcurl4-openssl-dev"; \
			echo "macOS: brew install curl"; \
			exit 1; \
		fi; \
	fi
	@if command -v wrk >/dev/null 2>&1; then \
		echo "✅ WRK found: $$(wrk --version 2>&1 | head -1)"; \
	else \
		echo "Error: wrk not found"; \
		echo "Ubuntu: sudo apt install wrk or compile from source"; \
		echo "macOS: brew install wrk"; \
		exit 1; \
	fi
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
	@echo "✅ Compilation successful!"
	@echo "Binary info:"
	@ls -la $(TARGET)
	@if command -v file >/dev/null 2>&1; then file $(TARGET); fi

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
    # Linux-specific library paths
    LDFLAGS += -L/usr/lib -L/usr/local/lib
    CXXFLAGS += -I/usr/include -I/usr/local/include
endif
ifeq ($(UNAME_S),Darwin)
    CXXFLAGS += -DMACOS
    # macOS specific flags - try multiple homebrew locations
    LDFLAGS += -L/opt/homebrew/lib -L/usr/local/lib
    CXXFLAGS += -I/opt/homebrew/include -I/usr/local/include
    # Prefer homebrew curl if available
    ifneq ($(wildcard /opt/homebrew/include/curl),)
        CXXFLAGS += -I/opt/homebrew/include
        LDFLAGS += -L/opt/homebrew/lib
    endif
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
