import { createServer } from 'vite';
// Isolated UI fixtures: no table connection, socket or save writes.
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4598, strictPort: true } });
await server.listen();
console.log('Conditions preview: http://127.0.0.1:4598/scripts/conditions-review.html');
