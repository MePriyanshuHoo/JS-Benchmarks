const { Hono } = require('hono');
const { serve } = require('@hono/node-server');

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' });
});

const port = 3002;
console.log(`Hono server listening on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
