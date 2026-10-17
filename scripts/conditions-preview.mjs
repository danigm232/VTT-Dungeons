import { build } from 'vite';
import express from 'express';
import { resolve } from 'node:path';
// Isolated UI fixtures: no table connection, socket or save writes.
const previewDir = resolve('tmp/conditions-preview');
await build({
  configFile: false, publicDir: false, logLevel: 'warn',
  build: { outDir: previewDir, emptyOutDir: false, reportCompressedSize: false,
    rollupOptions: { input: [resolve('scripts/conditions-review.html'), resolve('scripts/facing-review.html')] } }
});
if (process.argv.includes('--build-only')) process.exit(0);
const app = express();
app.use('/art', express.static(resolve('campaigns/one-shot/public/art')));
app.use('/art', express.static(resolve('campaigns/stormwreck-isle/public/art')));
app.use('/art', express.static(resolve('campaigns/camp-rests/public/art')));
app.use(express.static(previewDir));
await new Promise((resolveReady, reject) => app.listen(4598, '127.0.0.1', resolveReady).on('error', reject));
console.log('Conditions preview: http://127.0.0.1:4598/scripts/conditions-review.html');
