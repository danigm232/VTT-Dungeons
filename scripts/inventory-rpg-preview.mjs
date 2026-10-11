// Source UI preview; API, sockets and campaign art use an isolated test server.
// Never points at the table's live port or writes production campaign saves.
import { createServer } from 'vite';
const target = process.env.INVENTORY_TEST_URL || 'http://127.0.0.1:4597';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(target)) throw new Error('Use a loopback test server');
const server = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 4598, strictPort: true, proxy: Object.fromEntries(['/api', '/socket.io', '/art', '/audio'].map(route => [route, { target, ws: route === '/socket.io' }])) }
});
await server.listen();
console.log('Inventory UI preview: http://127.0.0.1:4598/apps/web/player.html');
