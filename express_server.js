const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express!", timestamp: Date.now() });
});

const server = app.listen(3000, "0.0.0.0", () => {
  console.log("Express server listening on port 3000");
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    console.log("Express server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle server errors
server.on("error", (err) => {
  console.error("Express server error:", err);
  process.exit(1);
});
