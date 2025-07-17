#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <fstream>
#include <regex>
#include <chrono>
#include <thread>
#include <cstdlib>
#include <signal.h>
#include <sys/wait.h>
#include <unistd.h>
#include <cmath>
#include <iomanip>
#include <algorithm>
#include <curl/curl.h>

struct BenchmarkConfig {
    int connections = 100;
    int threads = 12;
    std::string duration = "30s";
    std::string timeout = "10s";
    int warmupTime = 3000;
    int cooldownTime = 2000;
    int runs = 3;
    bool latencyStats = true;
};

struct BenchmarkResult {
    double requestsPerSecond = 0.0;
    double avgLatency = 0.0;
    double maxLatency = 0.0;
    double p50Latency = 0.0;
    double p75Latency = 0.0;
    double p90Latency = 0.0;
    double p99Latency = 0.0;
    double throughput = 0.0;
    int totalRequests = 0;
    int errors = 0;
    int timeouts = 0;
    int socketErrors = 0;
    std::string rawOutput;
};

struct Setup {
    std::string name;
    int port;
    std::string runtime;
    std::string framework;
    std::string script;
};

struct AggregatedResult {
    std::string environment;
    std::string runtime;
    std::string framework;
    double requestsPerSecond;
    double avgLatency;
    double p50Latency;
    double p90Latency;
    double p99Latency;
    double throughput;
    int totalRequests;
    int errors;
    int timeouts;
    double stdRps;
    double stdLatency;
    int runs;
    std::vector<BenchmarkResult> rawRuns;
};

class BenchmarkOrchestrator {
private:
    BenchmarkConfig config;
    std::vector<Setup> setups;
    std::vector<AggregatedResult> results;
    
    static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
        return size * nmemb;
    }
    
    bool checkServerHealth(int port) {
        CURL* curl;
        CURLcode res;
        bool healthy = false;
        
        curl = curl_easy_init();
        if(curl) {
            std::string url = "http://localhost:" + std::to_string(port);
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
            curl_easy_setopt(curl, CURLOPT_TIMEOUT, 1L);
            curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 1L);
            curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
            curl_easy_setopt(curl, CURLOPT_FAILONERROR, 1L);
            
            res = curl_easy_perform(curl);
            if(res == CURLE_OK) {
                healthy = true;
            }
            curl_easy_cleanup(curl);
        }
        
        return healthy;
    }
    
    bool waitForServer(int port, int maxAttempts = 20) {
        for(int i = 0; i < maxAttempts; i++) {
            if(checkServerHealth(port)) {
                return true;
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
        }
        return false;
    }
    
    std::string executeCommand(const std::string& command) {
        std::array<char, 128> buffer;
        std::string result;
        
        std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(command.c_str(), "r"), pclose);
        if (!pipe) {
            throw std::runtime_error("popen() failed!");
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {
            result += buffer.data();
        }
        
        return result;
    }
    
    double parseLatencyValue(const std::string& value, const std::string& unit) {
        double val = std::stod(value);
        if (unit == "us") return val / 1000.0; // microseconds to milliseconds
        if (unit == "ms") return val;
        if (unit == "s") return val * 1000.0;
        return val;
    }
    
    BenchmarkResult parseWrkOutput(const std::string& output) {
        BenchmarkResult result;
        std::istringstream iss(output);
        std::string line;
        
        std::regex rpsRegex(R"(Requests/sec:\s+([0-9.]+))");
        std::regex transferRegex(R"(Transfer/sec:\s+([0-9.]+)(KB|MB|GB))");
        std::regex totalRegex(R"((\d+) requests in)");
        std::regex latencyRegex(R"(Latency\s+([0-9.]+)(\w+)\s+([0-9.]+)(\w+)\s+([0-9.]+)(\w+)\s+([0-9.]+)%)");
        std::regex percentileRegex(R"(\s+(\d+)%\s+([0-9.]+)(\w+))");
        std::regex socketErrorRegex(R"(Socket errors: connect (\d+), read (\d+), write (\d+), timeout (\d+))");
        std::regex nonErrorRegex(R"(Non-2xx or 3xx responses: (\d+))");
        
        std::smatch match;
        
        while (std::getline(iss, line)) {
            if (std::regex_search(line, match, rpsRegex)) {
                result.requestsPerSecond = std::stod(match[1]);
            }
            
            if (std::regex_search(line, match, transferRegex)) {
                double bytes = std::stod(match[1]);
                std::string unit = match[2];
                if (unit == "KB") bytes *= 1024;
                else if (unit == "MB") bytes *= 1024 * 1024;
                else if (unit == "GB") bytes *= 1024 * 1024 * 1024;
                result.throughput = bytes;
            }
            
            if (std::regex_search(line, match, totalRegex)) {
                result.totalRequests = std::stoi(match[1]);
            }
            
            if (std::regex_search(line, match, latencyRegex)) {
                result.avgLatency = parseLatencyValue(match[1], match[2]);
                result.maxLatency = parseLatencyValue(match[5], match[6]);
            }
            
            if (std::regex_search(line, match, percentileRegex)) {
                int percentile = std::stoi(match[1]);
                double value = parseLatencyValue(match[2], match[3]);
                
                if (percentile == 50) result.p50Latency = value;
                else if (percentile == 75) result.p75Latency = value;
                else if (percentile == 90) result.p90Latency = value;
                else if (percentile == 99) result.p99Latency = value;
            }
            
            if (std::regex_search(line, match, socketErrorRegex)) {
                result.socketErrors = std::stoi(match[1]) + std::stoi(match[2]) + std::stoi(match[3]);
                result.timeouts = std::stoi(match[4]);
                result.errors = result.socketErrors + result.timeouts;
            }
            
            if (std::regex_search(line, match, nonErrorRegex)) {
                result.errors += std::stoi(match[1]);
            }
        }
        
        result.rawOutput = output;
        return result;
    }
    
    BenchmarkResult runWrkBenchmark(const std::string& url) {
        std::stringstream cmd;
        cmd << "wrk -c " << config.connections 
            << " -t " << config.threads 
            << " -d " << config.duration 
            << " --timeout " << config.timeout;
        
        if (config.latencyStats) {
            cmd << " --latency";
        }
        
        cmd << " " << url;
        
        std::string output = executeCommand(cmd.str());
        return parseWrkOutput(output);
    }
    
    pid_t startServer(const Setup& setup) {
        pid_t pid = fork();
        
        if (pid == 0) {
            // Child process
            setenv("NODE_ENV", "production", 1);
            execlp(setup.runtime.c_str(), setup.runtime.c_str(), setup.script.c_str(), nullptr);
            exit(1);
        } else if (pid > 0) {
            // Parent process
            return pid;
        } else {
            // Fork failed
            return -1;
        }
    }
    
    void stopServer(pid_t pid) {
        if (pid > 0) {
            kill(pid, SIGTERM);
            int status;
            waitpid(pid, &status, 0);
        }
    }
    
    double calculateMean(const std::vector<double>& values) {
        double sum = 0.0;
        for (double val : values) {
            sum += val;
        }
        return sum / values.size();
    }
    
    double calculateStdDev(const std::vector<double>& values, double mean) {
        double sum = 0.0;
        for (double val : values) {
            sum += (val - mean) * (val - mean);
        }
        return std::sqrt(sum / values.size());
    }
    
public:
    BenchmarkOrchestrator() {
        curl_global_init(CURL_GLOBAL_DEFAULT);
        
        setups = {
            {"Express on Node.js", 3000, "node", "express", "express_server.js"},
            {"Express on Bun", 3000, "bun", "express", "express_server.js"},
            {"Fastify on Node.js", 3001, "node", "fastify", "fastify_server.js"},
            {"Fastify on Bun", 3001, "bun", "fastify", "fastify_server.js"},
            {"Hono on Node.js", 3002, "node", "hono", "hono_server.js"},
            {"Hono on Bun", 3002, "bun", "hono", "hono_server.js"}
        };
    }
    
    ~BenchmarkOrchestrator() {
        curl_global_cleanup();
    }
    
    void runBenchmark(const Setup& setup) {
        std::cout << "\n=== Starting " << setup.name << " ===" << std::endl;
        
        std::vector<BenchmarkResult> runs;
        
        for (int run = 1; run <= config.runs; run++) {
            std::cout << "\n--- Run " << run << "/" << config.runs << " for " << setup.name << " ---" << std::endl;
            
            // Start server
            pid_t serverPid = startServer(setup);
            if (serverPid == -1) {
                std::cerr << "Failed to start server for " << setup.name << std::endl;
                continue;
            }
            
            // Wait for server to start
            std::this_thread::sleep_for(std::chrono::milliseconds(config.warmupTime));
            
            // Verify server is running
            if (!waitForServer(setup.port)) {
                std::cerr << "Server " << setup.name << " failed to start on port " << setup.port << std::endl;
                stopServer(serverPid);
                continue;
            }
            
            try {
                std::string url = "http://localhost:" + std::to_string(setup.port);
                BenchmarkResult result = runWrkBenchmark(url);
                runs.push_back(result);
                
                std::cout << "Run " << run << " Results:" << std::endl;
                std::cout << "  Requests/sec: " << std::fixed << std::setprecision(2) << result.requestsPerSecond << std::endl;
                std::cout << "  Avg Latency: " << result.avgLatency << "ms" << std::endl;
                std::cout << "  P50 Latency: " << result.p50Latency << "ms" << std::endl;
                std::cout << "  P90 Latency: " << result.p90Latency << "ms" << std::endl;
                std::cout << "  P99 Latency: " << result.p99Latency << "ms" << std::endl;
                std::cout << "  Throughput: " << (result.throughput / 1024 / 1024) << "MB/sec" << std::endl;
                std::cout << "  Total Requests: " << result.totalRequests << std::endl;
                std::cout << "  Errors: " << result.errors << std::endl;
                std::cout << "  Timeouts: " << result.timeouts << std::endl;
                
            } catch (const std::exception& e) {
                std::cerr << "Error in run " << run << " for " << setup.name << ": " << e.what() << std::endl;
            }
            
            // Stop server and cleanup
            stopServer(serverPid);
            std::this_thread::sleep_for(std::chrono::milliseconds(config.cooldownTime));
        }
        
        if (!runs.empty()) {
            // Calculate statistics
            std::vector<double> rpsValues, latencyValues, p50Values, p90Values, p99Values;
            double totalThroughput = 0, totalRequests = 0, totalErrors = 0, totalTimeouts = 0;
            
            for (const auto& run : runs) {
                rpsValues.push_back(run.requestsPerSecond);
                latencyValues.push_back(run.avgLatency);
                p50Values.push_back(run.p50Latency);
                p90Values.push_back(run.p90Latency);
                p99Values.push_back(run.p99Latency);
                totalThroughput += run.throughput;
                totalRequests += run.totalRequests;
                totalErrors += run.errors;
                totalTimeouts += run.timeouts;
            }
            
            double avgRps = calculateMean(rpsValues);
            double avgLatency = calculateMean(latencyValues);
            double avgP50 = calculateMean(p50Values);
            double avgP90 = calculateMean(p90Values);
            double avgP99 = calculateMean(p99Values);
            
            double stdRps = calculateStdDev(rpsValues, avgRps);
            double stdLatency = calculateStdDev(latencyValues, avgLatency);
            
            AggregatedResult result;
            result.environment = setup.name;
            result.runtime = setup.runtime;
            result.framework = setup.framework;
            result.requestsPerSecond = avgRps;
            result.avgLatency = avgLatency;
            result.p50Latency = avgP50;
            result.p90Latency = avgP90;
            result.p99Latency = avgP99;
            result.throughput = totalThroughput / runs.size();
            result.totalRequests = totalRequests;
            result.errors = totalErrors;
            result.timeouts = totalTimeouts;
            result.stdRps = stdRps;
            result.stdLatency = stdLatency;
            result.runs = runs.size();
            result.rawRuns = runs;
            
            results.push_back(result);
            
            std::cout << "\n" << setup.name << " - Average Results (" << runs.size() << " runs):" << std::endl;
            std::cout << "  Requests/sec: " << std::fixed << std::setprecision(2) << avgRps << " (±" << stdRps << ")" << std::endl;
            std::cout << "  Avg Latency: " << avgLatency << "ms (±" << stdLatency << ")" << std::endl;
            std::cout << "  P50 Latency: " << avgP50 << "ms" << std::endl;
            std::cout << "  P90 Latency: " << avgP90 << "ms" << std::endl;
            std::cout << "  P99 Latency: " << avgP99 << "ms" << std::endl;
            std::cout << "  Throughput: " << (result.throughput / 1024 / 1024) << "MB/sec" << std::endl;
            std::cout << "  Total Requests: " << totalRequests << std::endl;
            std::cout << "  Total Errors: " << totalErrors << std::endl;
            std::cout << "  Total Timeouts: " << totalTimeouts << std::endl;
        }
    }
    
    void runAllBenchmarks() {
        std::cout << "Starting WRK-based Framework Benchmark (C++)\n" << std::endl;
        std::cout << "Configuration:" << std::endl;
        std::cout << "- Connections: " << config.connections << std::endl;
        std::cout << "- Threads: " << config.threads << std::endl;
        std::cout << "- Duration: " << config.duration << std::endl;
        std::cout << "- Timeout: " << config.timeout << std::endl;
        std::cout << "- Runs per setup: " << config.runs << std::endl;
        std::cout << "- Warmup time: " << config.warmupTime << "ms" << std::endl;
        std::cout << "- Cooldown time: " << config.cooldownTime << "ms" << std::endl;
        std::cout << "- Latency statistics: " << (config.latencyStats ? "true" : "false") << std::endl;
        
        // Get versions
        std::cout << "\n=== Runtime Versions ===" << std::endl;
        try {
            std::cout << "Node.js: " << executeCommand("node --version") << std::endl;
        } catch (...) {
            std::cout << "Node.js: Not available" << std::endl;
        }
        
        try {
            std::cout << "Bun: " << executeCommand("bun --version") << std::endl;
        } catch (...) {
            std::cout << "Bun: Not available" << std::endl;
        }
        
        try {
            std::cout << "WRK: " << executeCommand("wrk --version 2>&1 | head -1") << std::endl;
        } catch (...) {
            std::cout << "WRK: Not available" << std::endl;
        }
        
        for (const auto& setup : setups) {
            runBenchmark(setup);
        }
        
        generateReport();
    }
    
    void generateReport() {
        std::cout << "\n=== FINAL RESULTS ===" << std::endl;
        
        // Sort by requests per second
        std::sort(results.begin(), results.end(), 
                  [](const AggregatedResult& a, const AggregatedResult& b) {
                      return a.requestsPerSecond > b.requestsPerSecond;
                  });
        
        std::cout << "\nRanking by Requests/Second:" << std::endl;
        for (size_t i = 0; i < results.size(); i++) {
            const auto& result = results[i];
            std::cout << (i + 1) << ". " << result.environment << ": " 
                      << std::fixed << std::setprecision(2) << result.requestsPerSecond 
                      << " req/sec (±" << result.stdRps << ")" << std::endl;
        }
        
        std::cout << "\nDetailed Comparison:" << std::endl;
        std::cout << std::left << std::setw(30) << "Environment" 
                  << std::setw(12) << "Req/sec" 
                  << std::setw(12) << "Avg Lat(ms)" 
                  << std::setw(12) << "P90 Lat(ms)" 
                  << std::setw(12) << "P99 Lat(ms)" 
                  << std::setw(16) << "Throughput(MB/s)" 
                  << "Errors" << std::endl;
        std::cout << std::string(120, '-') << std::endl;
        
        for (const auto& result : results) {
            double throughputMB = result.throughput / 1024 / 1024;
            std::cout << std::left << std::setw(30) << result.environment
                      << std::setw(12) << std::fixed << std::setprecision(2) << result.requestsPerSecond
                      << std::setw(12) << result.avgLatency
                      << std::setw(12) << result.p90Latency
                      << std::setw(12) << result.p99Latency
                      << std::setw(16) << throughputMB
                      << result.errors << std::endl;
        }
        
        // Node.js vs Bun comparison
        std::cout << "\n=== Node.js vs Bun Comparison ===" << std::endl;
        std::map<std::string, std::map<std::string, AggregatedResult>> frameworkGroups;
        
        for (const auto& result : results) {
            frameworkGroups[result.framework][result.runtime] = result;
        }
        
        for (const auto& [framework, group] : frameworkGroups) {
            if (group.find("node") != group.end() && group.find("bun") != group.end()) {
                const auto& nodeResult = group.at("node");
                const auto& bunResult = group.at("bun");
                
                double rpsImprovement = ((bunResult.requestsPerSecond - nodeResult.requestsPerSecond) / nodeResult.requestsPerSecond) * 100;
                double latencyImprovement = ((nodeResult.avgLatency - bunResult.avgLatency) / nodeResult.avgLatency) * 100;
                
                std::cout << "\n" << framework << " (uppercase):" << std::endl;
                std::cout << "  Node.js: " << std::fixed << std::setprecision(2) << nodeResult.requestsPerSecond 
                          << " req/sec, " << nodeResult.avgLatency << "ms avg latency" << std::endl;
                std::cout << "  Bun: " << bunResult.requestsPerSecond 
                          << " req/sec, " << bunResult.avgLatency << "ms avg latency" << std::endl;
                std::cout << "  RPS Improvement: " << std::setprecision(1) << rpsImprovement << "%" << std::endl;
                std::cout << "  Latency Improvement: " << latencyImprovement << "%" << std::endl;
            }
        }
        
        // Save results to JSON file
        saveResults();
    }
    
    void saveResults() {
        std::ofstream jsonFile("benchmark_results_wrk.json");
        std::ofstream csvFile("benchmark_results_wrk.csv");
        
        // Simple JSON output
        jsonFile << "{\n";
        jsonFile << "  \"timestamp\": \"" << std::time(nullptr) << "\",\n";
        jsonFile << "  \"benchmarkTool\": \"wrk\",\n";
        jsonFile << "  \"results\": [\n";
        
        for (size_t i = 0; i < results.size(); i++) {
            const auto& result = results[i];
            jsonFile << "    {\n";
            jsonFile << "      \"environment\": \"" << result.environment << "\",\n";
            jsonFile << "      \"runtime\": \"" << result.runtime << "\",\n";
            jsonFile << "      \"framework\": \"" << result.framework << "\",\n";
            jsonFile << "      \"requestsPerSecond\": " << result.requestsPerSecond << ",\n";
            jsonFile << "      \"avgLatency\": " << result.avgLatency << ",\n";
            jsonFile << "      \"p90Latency\": " << result.p90Latency << ",\n";
            jsonFile << "      \"p99Latency\": " << result.p99Latency << ",\n";
            jsonFile << "      \"throughput\": " << result.throughput << ",\n";
            jsonFile << "      \"errors\": " << result.errors << "\n";
            jsonFile << "    }";
            if (i < results.size() - 1) jsonFile << ",";
            jsonFile << "\n";
        }
        jsonFile << "  ]\n";
        jsonFile << "}\n";
        
        // CSV output
        csvFile << "Environment,Runtime,Framework,Requests/sec,Avg Latency(ms),P50 Latency(ms),P90 Latency(ms),P99 Latency(ms),Throughput(MB/s),Total Requests,Errors,Timeouts,RPS StdDev,Latency StdDev\n";
        
        for (const auto& result : results) {
            csvFile << "\"" << result.environment << "\","
                   << result.runtime << ","
                   << result.framework << ","
                   << std::fixed << std::setprecision(2) << result.requestsPerSecond << ","
                   << result.avgLatency << ","
                   << result.p50Latency << ","
                   << result.p90Latency << ","
                   << result.p99Latency << ","
                   << (result.throughput / 1024 / 1024) << ","
                   << result.totalRequests << ","
                   << result.errors << ","
                   << result.timeouts << ","
                   << result.stdRps << ","
                   << result.stdLatency << "\n";
        }
        
        std::cout << "\nDetailed results saved to benchmark_results_wrk.json" << std::endl;
        std::cout << "CSV results saved to benchmark_results_wrk.csv" << std::endl;
    }
};

int main() {
    BenchmarkOrchestrator orchestrator;
    orchestrator.runAllBenchmarks();
    return 0;
}