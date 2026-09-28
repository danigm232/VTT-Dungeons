import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ build: { outDir:'output/a1-review/site', emptyOutDir:true, rollupOptions:{ input:resolve('scripts/a1-review.html') } } });
