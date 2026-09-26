import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      input: {
        dm: resolve(import.meta.dirname, 'apps/web/dm.html'),
        'dm-mobile': resolve(import.meta.dirname, 'apps/web/dm-mobile.html'),
        player: resolve(import.meta.dirname, 'apps/web/player.html'),
        projector: resolve(import.meta.dirname, 'apps/web/projector.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@babylonjs')) {
            return 'babylon-vendor';
          }
          if (id.includes('node_modules/pixi.js')) {
            return 'pixi-vendor';
          }
        }
      }
    }
  }
});
