import { D8NIGHT, D8_VERSION } from "./d8night.config";
import { createD8Scene } from "./renderer";
import {D8_ASSETS} from './generated-assets';

export function createScene(engine: any, canvas: any) {
  return createD8Scene(engine, canvas, { config: D8NIGHT, version: D8_VERSION,assetUrls:D8_ASSETS });
}
