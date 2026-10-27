import { createServer } from 'vite';

async function start() {
  const server = await createServer({
    server: {
      port: 3000,
      host: '127.0.0.1'
    }
  });
  await server.listen();
  console.log('Sahakar-Link Vite dev server active on http://127.0.0.1:3000/');
  setInterval(() => {}, 60000);
}

start().catch((err) => {
  console.error('Failed to start Vite server:', err);
  process.exit(1);
});
