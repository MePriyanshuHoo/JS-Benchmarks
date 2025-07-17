const fastify = require('fastify')({ logger: false });

fastify.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
    console.log('Fastify server listening on port 3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
