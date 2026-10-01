#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const version = (await fs.readFile(path.join(here, "VERSION"), "utf8")).trim();
const outputName = `playground_v${version}.json`;

const files = {
  "index.ts": await fs.readFile(path.join(here, "index.ts"), "utf8"),
  "d8night.config.ts": await fs.readFile(path.join(here, "d8night.config.ts"), "utf8")
};

const manifest = {
  v: 2,
  language: "TS",
  entry: "index.ts",
  imports: {},
  files
};

const code = JSON.stringify(manifest);

const payload = {
  code,
  unicode: Buffer.from(code, "utf8").toString("base64"),
  engine: "WebGL2",
  version: 2
};

const output = {
  payload: JSON.stringify(payload),
  name: `D8 Night VTT · v${version}`,
  description: `D8 Night VTT Babylon Playground · Scene Engine v${version}`,
  tags: "d8-night,vtt,dnd"
};

await fs.writeFile(path.join(here, outputName), JSON.stringify(output), "utf8");
console.log(`Generated ${outputName}`);
