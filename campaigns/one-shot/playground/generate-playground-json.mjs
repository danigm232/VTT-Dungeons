#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const historicalDir = path.join(here, "historico");

const version = (await fs.readFile(path.join(here, "VERSION"), "utf8")).trim();
if (!/^\d+$/.test(version)) {
  throw new Error(`VERSION must contain only a numeric version. Received: "${version}"`);
}

const versionTag = `V${version}`;
const outputName = `playground_v${version}.json`;
const currentName = "playground_current.json";

const files = {
  "index.ts": await fs.readFile(path.join(here, "index.ts"), "utf8"),
  "d8night.config.ts": await fs.readFile(path.join(here, "d8night.config.ts"), "utf8")
};

const declaredVersion = files["d8night.config.ts"].match(/D8_VERSION\s*=\s*"([^"]+)"/)?.[1];
if (declaredVersion !== versionTag) {
  throw new Error(
    `Version mismatch: VERSION=${version}, but d8night.config.ts declares ${declaredVersion ?? "no D8_VERSION"}`
  );
}

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
  description: `D8 Night VTT Babylon Playground · active build v${version}`,
  tags: "d8-night,vtt,dnd,2.5d"
};

const serialized = JSON.stringify(output);

// Archive any older numbered build left in the active folder.
await fs.mkdir(historicalDir, { recursive: true });
for (const entry of await fs.readdir(here)) {
  const match = entry.match(/^playground_v(\d+)\.json$/);
  if (!match || entry === outputName) continue;

  const source = path.join(here, entry);
  const target = path.join(historicalDir, entry);
  try {
    await fs.access(target);
    await fs.unlink(source);
  } catch {
    await fs.rename(source, target);
  }
}

// Both files are intentionally byte-identical.
// - playground_current.json: canonical file to load in Babylon.
// - playground_vN.json: immutable numbered snapshot of the current build.
await fs.writeFile(path.join(here, outputName), serialized, "utf8");
await fs.writeFile(path.join(here, currentName), serialized, "utf8");

console.log(`Generated ${outputName} and ${currentName} from VERSION=${version}`);
