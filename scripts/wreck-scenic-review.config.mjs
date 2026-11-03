import base from './wreck-atmosphere-review.config.mjs';
// Separate dependency cache: the old inspector can stay open independently.
export default {...base,cacheDir:'node_modules/.vite-wreck-scenic',server:{...base.server,port:4635}};
