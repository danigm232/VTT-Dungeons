import base from './wreck-atmosphere-review.config.mjs';
// Do not reuse the inspector/cache of another running review session.
export default {...base,cacheDir:process.env.WRECK_REVIEW_CACHE??'node_modules/.vite-wreck-performance',server:{...base.server,port:Number(process.env.WRECK_REVIEW_PORT??4636)}};
