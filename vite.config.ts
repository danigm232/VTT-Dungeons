import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/',
  // Current Stormwreck finish is installed by default. An explicit 0 keeps
  // the baseline available to isolated comparison builds.
  define: { __STORMWRECK_STYLE_SAMPLE__: JSON.stringify(process.env.DUNGEONS_STYLE_SAMPLE !== '0') },
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
          if (id.includes('node_modules/@babylonjs/loaders') || id.includes('node_modules/babylonjs-gltf2interface')) {
            return 'babylon-loaders';
          }
          if (id.includes('node_modules/pixi.js')) {
            return 'pixi-vendor';
          }
        }
      }
    }
  }
});
