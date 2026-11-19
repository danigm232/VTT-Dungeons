import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

// --- Pure Node PNG Encoder ---
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // Filter: None
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- Procedural Noise & Utility Functions ---
function fract(x) { return x - Math.floor(x); }
function hash(x, y) { return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123); }

function noise2d(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = fract(x), fy = fract(y);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x, y, octaves = 4) {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise2d(x * freq, y * freq);
    freq *= 2.05;
    amp *= 0.5;
  }
  return v;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// --- 1. Generate Volcanic Ridges (2048 x 512) ---
function generateVolcanicRidges() {
  const w = 2048, h = 512;
  const buf = Buffer.alloc(w * h * 4);

  for (let x = 0; x < w; x++) {
    const t = x / w;
    // Base envelope: peaks in middle-right, tapers to sea level at edges
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.7);
    
    // Central volcanic peak (Monte Sharruth) at t ~ 0.52
    const volcanoPeak = 0.45 * Math.exp(-Math.pow((t - 0.52) / 0.12, 2));
    
    // Coastal ridges and jagged crags
    const jagged = 0.18 * Math.sin(t * 19 + 0.3)
                 + 0.11 * Math.sin(t * 43 + 1.2)
                 + 0.06 * Math.sin(t * 97 + 2.7)
                 + 0.08 * fbm(t * 24, 1.5, 4);

    // Height of ridge from top: 0 = very top, 1 = bottom
    // Higher ridge -> smaller topY
    const ridgeNorm = (0.28 + volcanoPeak + jagged * 0.7) * envelope;
    const topY = Math.floor(h * (0.85 - ridgeNorm * 0.75));

    // Secondary lower ridge (middle coastal cliffs)
    const midRidgeNorm = (0.18 + jagged * 0.5) * envelope;
    const midTopY = Math.floor(h * (0.88 - midRidgeNorm * 0.65));

    for (let y = 0; y < h; y++) {
      const idx = (y * w + x) * 4;

      // Fumarole plume rising from central peak
      let fumaroleAlpha = 0;
      if (t > 0.47 && t < 0.57 && y < topY + 40) {
        const fumeCenter = 0.52 + Math.sin(y * 0.03) * 0.015 - (topY - y) * 0.0003;
        const fumeDist = Math.abs(t - fumeCenter);
        const fumeWidth = 0.012 + (topY - y) * 0.0001;
        if (fumeDist < fumeWidth * 2) {
          const plume = Math.exp(-Math.pow(fumeDist / fumeWidth, 2)) * fbm(t * 60, y * 0.05 + 2, 3);
          const fadeUp = clamp((topY - y) / 80, 0, 1) * clamp(y / 40, 0, 1);
          fumaroleAlpha = plume * fadeUp * 0.45;
        }
      }

      if (y < topY) {
        // Above the ridge: transparent or faint fumarole
        if (fumaroleAlpha > 0.01) {
          buf[idx] = 180;      // R: pale steam
          buf[idx + 1] = 195;  // G
          buf[idx + 2] = 200;  // B
          buf[idx + 3] = Math.floor(fumaroleAlpha * 255);
        } else {
          buf[idx] = 0;
          buf[idx + 1] = 0;
          buf[idx + 2] = 0;
          buf[idx + 3] = 0;
        }
        continue;
      }

      // Inside the mountain body
      const depthIntoRock = (y - topY) / (h - topY + 1); // 0 at crest, 1 at base
      
      // Vertical basalt column strata & noise
      const columnStrata = Math.sin(x * 0.18 + fbm(x * 0.02, y * 0.04) * 4);
      const rockNoise = fbm(x * 0.04, y * 0.08, 4);
      const terrace = Math.floor((y - topY) / 28) % 2;

      // Color base: basalt slate #3C555C to dark base #283538
      let r = 60 + columnStrata * 6 + rockNoise * 15;
      let g = 85 + columnStrata * 8 + rockNoise * 20;
      let b = 92 + columnStrata * 9 + rockNoise * 22;

      // Atmospheric distance gradient (higher/further = cooler grey-blue tint)
      const altitude = 1 - depthIntoRock;
      r = r * 0.75 + 96 * altitude * 0.25;
      g = g * 0.75 + 117 * altitude * 0.25;
      b = b * 0.75 + 121 * altitude * 0.25;

      // Base waterline darkening & splash
      if (depthIntoRock > 0.8) {
        const waterFade = (depthIntoRock - 0.8) / 0.2;
        r = r * (1 - waterFade * 0.4);
        g = g * (1 - waterFade * 0.3);
        b = b * (1 - waterFade * 0.25);
      }

      // Twisted coastal pine patches (small dark green accents on ledges)
      const isLedge = terrace === 1 && (y - topY) > 40 && (y - topY) < 220;
      const pineCluster = isLedge && noise2d(x * 0.08, y * 0.12) > 0.65;
      if (pineCluster) {
        r = 38 + rockNoise * 8;
        g = 58 + rockNoise * 12;
        b = 48 + rockNoise * 10;
      }

      // Alpha edge smoothing at the crest
      let alpha = 1.0;
      const distFromCrest = y - topY;
      if (distFromCrest < 3) alpha = distFromCrest / 3;

      // Soft edge at left and right extremes
      const edgeH = Math.min(t, 1 - t) * 12;
      alpha *= clamp(edgeH, 0, 1);

      buf[idx] = clamp(Math.floor(r), 0, 255);
      buf[idx + 1] = clamp(Math.floor(g), 0, 255);
      buf[idx + 2] = clamp(Math.floor(b), 0, 255);
      buf[idx + 3] = clamp(Math.floor(alpha * 255), 0, 255);
    }
  }

  return encodePng(w, h, buf);
}

// --- 2. Generate Horizon Mist (1024 x 256) ---
function generateHorizonMist() {
  const w = 1024, h = 256;
  const buf = Buffer.alloc(w * h * 4);

  for (let x = 0; x < w; x++) {
    const t = x / w;
    for (let y = 0; y < h; y++) {
      const ny = y / h; // 0 = top, 1 = bottom
      const idx = (y * w + x) * 4;

      // Bell curve vertically for fog bank: maximum density at ny ~ 0.55
      const vertProfile = Math.sin(Math.PI * ny);
      
      // Organic cloud wisps
      const wisp = fbm(t * 8 + 0.5, ny * 4, 3);
      const wispDetail = fbm(t * 22, ny * 10, 2);
      
      const density = Math.pow(vertProfile, 1.4) * (0.55 + 0.35 * wisp + 0.10 * wispDetail);
      
      // Soft horizontal fades at edges
      const edgeFade = clamp(Math.min(t, 1 - t) * 8, 0, 1);
      const alpha = clamp(density * edgeFade * 0.48, 0, 1);

      // Sea mist color: cool teal grey #74908F
      const r = 116 + wispDetail * 15;
      const g = 144 + wispDetail * 18;
      const b = 143 + wispDetail * 20;

      buf[idx] = clamp(Math.floor(r), 0, 255);
      buf[idx + 1] = clamp(Math.floor(g), 0, 255);
      buf[idx + 2] = clamp(Math.floor(b), 0, 255);
      buf[idx + 3] = clamp(Math.floor(alpha * 255), 0, 255);
    }
  }

  return encodePng(w, h, buf);
}

// --- Main Execution ---
const root = process.cwd();
const shipArtDir = path.join(root, 'campaigns/stormwreck-isle/public/art/ship');
const previewDir = path.join(root, 'output/stormwreck-zone-finish-20261104');

console.log('Generando scenic-volcanic-ridges-art.png (2048x512)...');
const ridgesPng = generateVolcanicRidges();
fs.writeFileSync(path.join(shipArtDir, 'scenic-volcanic-ridges-art.png'), ridgesPng);
fs.writeFileSync(path.join(previewDir, 'scenic-volcanic-ridges-art.png'), ridgesPng);

console.log('Generando scenic-horizon-mist-art.png (1024x256)...');
const mistPng = generateHorizonMist();
fs.writeFileSync(path.join(shipArtDir, 'scenic-horizon-mist-art.png'), mistPng);
fs.writeFileSync(path.join(previewDir, 'scenic-horizon-mist-art.png'), mistPng);

console.log('Archivos generados con éxito.');
