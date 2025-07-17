const { Hono } = require("hono");
const { serve } = require("@hono/node-server");

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "Hello from Hono!", timestamp: Date.now() });
});

const port = 3002;

const server = serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});

console.log(`Hono server listening on port ${port}`);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  if (server && server.close) {
    server.close(() => {
      console.log("Hono server closed");
      process.exit(0);
    });
  } else {
    console.log("Hono server closed");
    process.exit(0);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception in Hono server:", err);
  process.exit(1);
});
