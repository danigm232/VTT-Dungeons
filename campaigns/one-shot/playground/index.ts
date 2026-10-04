import { D8NIGHT, D8_VERSION } from "./d8night.config";
import { createD8Scene } from "./renderer";

export function createScene(engine: any, canvas: any) {
  return createD8Scene(engine, canvas, { config: D8NIGHT, version: D8_VERSION });
}
