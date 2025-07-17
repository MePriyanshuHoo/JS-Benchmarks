const fastify = require("fastify")({ logger: false });

fastify.get("/", async (request, reply) => {
  return { message: "Hello from Fastify!", timestamp: Date.now() };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: "0.0.0.0" });
    console.log("Fastify server listening on port 3001");
  } catch (err) {
    console.error("Failed to start Fastify server:", err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  try {
    await fastify.close();
    console.log("Fastify server closed");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start();
