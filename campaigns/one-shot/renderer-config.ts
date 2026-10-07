import { D8NIGHT, D8_VERSION } from './playground/d8night.config.js';

// This is the only D8 Playground data allowed to cross the web socket/HTTP
// boundary. It deliberately drops CANON and all narrative interaction data.
const privateKey = /canon|secret|interact|dialog|message|story|reveal|trigger|narrative|spoiler/i;
function publicVisualData(value: any): any {
  if (Array.isArray(value)) return value.map(publicVisualData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !privateKey.test(key))
    .map(([key, entry]) => [key, publicVisualData(entry)]));
}

export function d8PublicRendererConfig() {
  const maps = Object.fromEntries(Object.entries(D8NIGHT.maps).map(([id, config]: [string, any]) => [id, {
    label: config.label,
    spawn: config.spawn,
    camera: config.camera,
    MAP: publicVisualData(config.MAP),
    VTT_AMBIENCE: publicVisualData({
      environment: config.VTT_AMBIENCE.environment,
      lighting: config.VTT_AMBIENCE.lighting,
      vfx: config.VTT_AMBIENCE.vfx,
      visual: config.VTT_AMBIENCE.visual,
      horizon: config.VTT_AMBIENCE.horizon
    })
  }]));
  return { version: D8_VERSION, maps };
}
