import {build} from 'vite';

// A read-only, Silverfarben-only gallery served by the existing /art route.
// Never empty this folder: it contains the accepted PNG originals.
await build({configFile:false,publicDir:false,build:{
  emptyOutDir:false,outDir:'campaigns/one-shot/public/art/silverfarben-v3',
  target:'es2022',lib:{entry:'scripts/silverfarben-review.ts',formats:['es'],fileName:()=>'review.js'},
  rollupOptions:{output:{inlineDynamicImports:true}}
}});
