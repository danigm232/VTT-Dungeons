import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.STORMWRECK_REVIEW_PORT ?? 4480);

if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 3000) {
  throw new Error('Invalid isolated review port');
}

const app = express();

// Serve the report directory at root
app.use(express.static(path.join(root, 'output/stormwreck-zone-finish-20261104'), {
  etag: false,
  lastModified: false,
  maxAge: 0,
  setHeaders(response) {
    response.setHeader('Cache-Control', 'no-store');
  }
}));

// Also serve /docs for markdown links referenced from the report
app.use('/docs', express.static(path.join(root, 'docs')));

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Servidor local del informe de zonas activo en: http://127.0.0.1:${port}/#wreck-ship`);
});

server.on('error', error => {
  console.error(`Error en servidor de revisión: ${error.message}`);
  process.exitCode = 1;
});
