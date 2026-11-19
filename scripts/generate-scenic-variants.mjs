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
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

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
    freq *= 2.05; amp *= 0.5;
  }
  return v;
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// --- RENDER COMPOSITE SCENIC ARTWORK (1280 x 720) ---
function renderScenicVariant(mode = 'night') {
  const w = 1280, h = 720;
  const buf = Buffer.alloc(w * h * 4);

  // Sea level horizon line in frame
  const seaY = Math.floor(h * 0.54);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const nx = x / w, ny = y / h;

      // ----------------------------------------------------
      // 1. SKY / CELESTIAL BACKGROUND
      // ----------------------------------------------------
      let skyR = 0, skyG = 0, skyB = 0;

      if (mode === 'night') {
        // Night palette: Deep midnight navy #070e14 to atmospheric horizon #14232c
        const skyGrad = y / seaY;
        skyR = 7 + skyGrad * 14;
        skyG = 14 + skyGrad * 21;
        skyB = 22 + skyGrad * 26;

        // Starfield above the horizon
        if (y < seaY - 8) {
          const starSeed = hash(x * 1.73 + 12.3, y * 2.11 + 45.7);
          const starChance = starSeed > 0.992;
          if (starChance) {
            const brightness = Math.pow((starSeed - 0.992) / 0.008, 1.8);
            const twinkle = 0.75 + 0.25 * Math.sin(x * 0.3 + y * 0.4);
            const starVal = Math.floor(brightness * twinkle * 255);
            // Slight color variation: blue-white or warm gold
            const isWarm = hash(x, y) > 0.7;
            skyR = clamp(skyR + (isWarm ? starVal : Math.floor(starVal * 0.85)), 0, 255);
            skyG = clamp(skyG + Math.floor(starVal * 0.92), 0, 255);
            skyB = clamp(skyB + (isWarm ? Math.floor(starVal * 0.7) : starVal), 0, 255);
          }
          // Faint Milky Way / celestial nebula haze across the sky
          const nebula = fbm(nx * 4 + 1.2, ny * 3, 3) * (1 - ny * 1.4);
          if (nebula > 0.45) {
            const nFactor = (nebula - 0.45) * 45;
            skyR += nFactor * 0.5;
            skyG += nFactor * 0.8;
            skyB += nFactor * 1.1;
          }
        }
      } else if (mode === 'day') {
        // Day palette: Coastal maritime cyan-grey #2a4652 to sky azure #1e3540
        const skyGrad = y / seaY;
        skyR = 30 + skyGrad * 16;
        skyG = 56 + skyGrad * 18;
        skyB = 72 + skyGrad * 14;

        // High cirrus clouds
        if (y < seaY) {
          const cloud = fbm(nx * 6 + 0.4, ny * 8 + 0.2, 4);
          if (cloud > 0.48) {
            const cAlpha = (cloud - 0.48) * 65;
            skyR += cAlpha * 0.85;
            skyG += cAlpha * 0.92;
            skyB += cAlpha * 0.95;
          }
        }
      } else if (mode === 'storm') {
        // Storm palette: Slate tempest grey #121c21 to brooding bruise purple-grey #1c2328
        const skyGrad = y / seaY;
        skyR = 18 + skyGrad * 12;
        skyG = 25 + skyGrad * 14;
        skyB = 30 + skyGrad * 16;

        // Heavy squall cloud masses with rain curtains
        const squall = fbm(nx * 5, ny * 4, 4);
        skyR += squall * 22;
        skyG += squall * 24;
        skyB += squall * 28;

        // Distant lightning flash glow on eastern horizon
        if (nx > 0.75 && nx < 0.92 && ny > 0.2 && ny < 0.55) {
          const lDist = Math.hypot(nx - 0.83, ny - 0.38);
          if (lDist < 0.16) {
            const flash = Math.exp(-lDist * 22) * 55;
            skyR += flash * 0.8;
            skyG += flash * 0.95;
            skyB += flash * 1.2;
          }
        }
      }

      // ----------------------------------------------------
      // 2. SEA / OCEAN PLANE (y >= seaY)
      // ----------------------------------------------------
      let seaR = 0, seaG = 0, seaB = 0;
      if (y >= seaY) {
        const depth = (y - seaY) / (h - seaY); // 0 at horizon, 1 at camera
        const waveChop = noise2d(nx * 45, ny * 65);

        if (mode === 'night') {
          seaR = 10 + depth * 14 + waveChop * 6;
          seaG = 22 + depth * 28 + waveChop * 10;
          seaB = 30 + depth * 35 + waveChop * 12;
          // Moonlight path reflection on open sea
          if (nx > 0.62 && nx < 0.88) {
            const moonDist = Math.abs(nx - 0.75);
            const moonGleam = Math.exp(-Math.pow(moonDist / 0.08, 2)) * Math.pow(waveChop, 2.5);
            seaR += moonGleam * 95;
            seaG += moonGleam * 125;
            seaB += moonGleam * 145;
          }
        } else if (mode === 'day') {
          seaR = 25 + depth * 35 + waveChop * 15;
          seaG = 65 + depth * 65 + waveChop * 22;
          seaB = 85 + depth * 60 + waveChop * 24;
          // Sun glint and emerald shallows
          const glint = Math.pow(waveChop, 4) * 55;
          seaR += glint; seaG += glint * 1.1; seaB += glint * 1.05;
        } else {
          seaR = 16 + depth * 18 + waveChop * 8;
          seaG = 32 + depth * 32 + waveChop * 14;
          seaB = 38 + depth * 38 + waveChop * 16;
          // Whitecaps on storm waves
          if (waveChop > 0.72) {
            const cap = (waveChop - 0.72) / 0.28 * 140;
            seaR += cap; seaG += cap * 1.1; seaB += cap * 1.1;
          }
        }
      }

      // Base background pixel (Sky or Sea)
      let r = (y < seaY) ? skyR : seaR;
      let g = (y < seaY) ? skyG : seaG;
      let b = (y < seaY) ? skyB : seaB;

      // ----------------------------------------------------
      // 3. FLANCO IZQUIERDO/CENTRO: ACANTILADOS DE BASALTO & CUMBRES
      // (nx from 0.0 to 0.62, tapers down to sea at 0.65)
      // ----------------------------------------------------
      if (nx < 0.65) {
        const tCliff = nx / 0.65;
        const cliffEnvelope = Math.pow(Math.cos(tCliff * Math.PI * 0.5), 0.6);
        
        // Volcano central peak (Monte Sharruth) around nx ~ 0.35
        const volcano = 0.38 * Math.exp(-Math.pow((nx - 0.32) / 0.10, 2));
        const crag = 0.16 * Math.sin(nx * 18) + 0.08 * Math.sin(nx * 42) + 0.06 * fbm(nx * 30, 2.0);
        const mountainHeight = (0.24 + volcano + crag) * cliffEnvelope;
        const mountainTopY = seaY - Math.floor(mountainHeight * h * 0.85);

        if (y >= mountainTopY && y < seaY + 4) {
          // Inside the basalt cliff / mountain silhouette
          const cliffDepth = (y - mountainTopY) / Math.max(1, seaY - mountainTopY);
          const basaltColumns = Math.sin(x * 0.25 + fbm(x * 0.03, y * 0.06) * 3);
          const rockNoise = fbm(x * 0.05, y * 0.1, 4);

          let cr = (mode === 'night') ? (22 + rockNoise * 14) : (48 + rockNoise * 22);
          let cg = (mode === 'night') ? (32 + rockNoise * 16) : (68 + rockNoise * 26);
          let cb = (mode === 'night') ? (36 + rockNoise * 18) : (75 + rockNoise * 28);

          // Add vertical basalt column shading
          cr += basaltColumns * 4;
          cg += basaltColumns * 6;
          cb += basaltColumns * 7;

          // Atmospheric perspective (distance haze tint)
          const distHaze = 1 - cliffDepth * 0.6;
          cr = cr * 0.6 + skyR * 0.4 * distHaze;
          cg = cg * 0.6 + skyG * 0.4 * distHaze;
          cb = cb * 0.6 + skyB * 0.4 * distHaze;

          // Faint volcanic fumarole rising from peak
          if (nx > 0.30 && nx < 0.35 && y < mountainTopY + 25) {
            cr += 20; cg += 25; cb += 28;
          }

          r = cr; g = cg; b = cb;
        }
      }

      // ----------------------------------------------------
      // 4. FLANCO COSTERO: CEMENTERIO DE PECIOS & ROCAS TRAICIONERAS
      // Placed at medium distance in the sea (nx 0.05 to 0.58, y around seaY-15 to seaY+60)
      // ----------------------------------------------------

      // WRECK 1: Broken Merchant Carrack listing to port (nx ~ 0.18, y ~ seaY - 8)
      const w1_cx = 0.18, w1_cy = seaY + 6;
      const dx1 = (nx - w1_cx) * w, dy1 = (y - w1_cy);
      // Tilted hull ellipse
      const rot1_x = dx1 * 0.94 - dy1 * 0.34;
      const rot1_y = dx1 * 0.34 + dy1 * 0.94;
      const inHull1 = (Math.pow(rot1_x / 52, 2) + Math.pow(rot1_y / 18, 2)) < 1.0 && y <= w1_cy + 8;
      // Broken main mast leaning backwards
      const mast1_dist = Math.abs(dx1 + dy1 * 0.28);
      const inMast1 = mast1_dist < 2.5 && dy1 > -72 && dy1 < 4;
      // Broken bowsprit
      const bow1_dist = Math.abs((dx1 + 42) * 0.7 - dy1 * 0.7);
      const inBow1 = bow1_dist < 2.0 && dx1 > -58 && dx1 < -32 && dy1 < 2;

      // WRECK 2: Skeletal hull ribs sticking out like teeth (nx ~ 0.42, y ~ seaY + 18)
      const w2_cx = 0.42, w2_cy = seaY + 16;
      const dx2 = (nx - w2_cx) * w, dy2 = (y - w2_cy);
      let inRibs2 = false;
      for (let rib = -3; rib <= 3; rib++) {
        const rx = dx2 - rib * 11;
        const arch = Math.pow(rx / 6, 2) + Math.pow((dy2 + 18) / 22, 2);
        if (Math.abs(arch - 1.0) < 0.28 && dy2 > -34 && dy2 < 4) inRibs2 = true;
      }
      // Fractured keel bar
      const inKeel2 = Math.abs(dy2) < 3.5 && Math.abs(dx2) < 42;

      // WRECK 3: Distant half-sunken mast and crossbeam (nx ~ 0.54, y ~ seaY + 4)
      const dx3 = (nx - 0.54) * w, dy3 = (y - (seaY + 2));
      const inMast3 = Math.abs(dx3 + dy3 * 0.18) < 1.8 && dy3 > -48 && dy3 < 2;
      const inYard3 = Math.abs(dy3 + 28 - dx3 * 0.2) < 1.5 && Math.abs(dx3) < 18;

      // JAGGED REEF SPIRES (Sea stacks around the wrecks)
      const inSpire1 = (Math.abs((nx - 0.12) * w + (y - seaY) * 0.2) < 7 - (seaY + 18 - y) * 0.18) && y > seaY - 32 && y <= seaY + 18;
      const inSpire2 = (Math.abs((nx - 0.28) * w) < 9 - (seaY + 22 - y) * 0.22) && y > seaY - 38 && y <= seaY + 22;
      const inSpire3 = (Math.abs((nx - 0.48) * w - (y - seaY) * 0.15) < 8 - (seaY + 26 - y) * 0.2) && y > seaY - 35 && y <= seaY + 26;

      const isWreckWood = inHull1 || inMast1 || inBow1 || inRibs2 || inKeel2 || inMast3 || inYard3;
      const isReefSpire = inSpire1 || inSpire2 || inSpire3;

      if (isWreckWood) {
        // Weathered blackened oak timber #343f3e / dark salt timber
        const timberNoise = noise2d(x * 0.2, y * 0.2);
        let tr = (mode === 'night') ? (18 + timberNoise * 10) : (42 + timberNoise * 16);
        let tg = (mode === 'night') ? (24 + timberNoise * 12) : (52 + timberNoise * 18);
        let tb = (mode === 'night') ? (26 + timberNoise * 12) : (50 + timberNoise * 18);
        r = tr; g = tg; b = tb;
      } else if (isReefSpire) {
        // Sharp black volcanic basalt spire
        let sr = (mode === 'night') ? 14 : 35;
        let sg = (mode === 'night') ? 22 : 48;
        let sb = (mode === 'night') ? 25 : 54;
        r = sr; g = sg; b = sb;
      }

      // Rompiente de espuma blanca alrededor de cada pecio y roca en la línea de agua
      const nearWreckWater = (isWreckWood || isReefSpire) && Math.abs(y - seaY) < 6;
      const isFoamCollar = !isWreckWood && !isReefSpire && (
        (Math.hypot(dx1, dy1) < 58 && Math.abs(dy1) < 8) ||
        (Math.hypot(dx2, dy2) < 46 && Math.abs(dy2) < 8) ||
        (Math.hypot((nx - 0.12) * w, y - seaY - 14) < 18) ||
        (Math.hypot((nx - 0.28) * w, y - seaY - 18) < 22) ||
        (Math.hypot((nx - 0.48) * w, y - seaY - 22) < 20)
      );

      if (isFoamCollar) {
        const foamTurb = noise2d(x * 0.35, y * 0.35);
        if (foamTurb > 0.38) {
          const fAmt = (foamTurb - 0.38) / 0.62;
          const fr = (mode === 'night') ? (165 + fAmt * 70) : (220 + fAmt * 35);
          const fg = (mode === 'night') ? (195 + fAmt * 55) : (245 + fAmt * 10);
          const fb = (mode === 'night') ? (205 + fAmt * 45) : (240 + fAmt * 15);
          r = r * (1 - fAmt * 0.85) + fr * (fAmt * 0.85);
          g = g * (1 - fAmt * 0.85) + fg * (fAmt * 0.85);
          b = b * (1 - fAmt * 0.85) + fb * (fAmt * 0.85);
        }
      }

      // ----------------------------------------------------
      // 5. FLANCO DERECHO: HORIZONTE MARINO Y BRUMA BAJA (nx > 0.58)
      // ----------------------------------------------------
      if (nx > 0.55 && Math.abs(y - seaY) < 16) {
        const mistDist = Math.abs(y - seaY) / 16;
        const mistAlpha = (1 - mistDist) * (0.45 + 0.35 * noise2d(nx * 12, ny * 18));
        const mr = (mode === 'night') ? 22 : 95;
        const mg = (mode === 'night') ? 38 : 128;
        const mb = (mode === 'night') ? 44 : 138;
        r = r * (1 - mistAlpha) + mr * mistAlpha;
        g = g * (1 - mistAlpha) + mg * mistAlpha;
        b = b * (1 - mistAlpha) + mb * mistAlpha;
      }

      buf[idx]     = clamp(Math.floor(r), 0, 255);
      buf[idx + 1] = clamp(Math.floor(g), 0, 255);
      buf[idx + 2] = clamp(Math.floor(b), 0, 255);
      buf[idx + 3] = 255;
    }
  }

  return encodePng(w, h, buf);
}

// --- GENERATE ALL THREE VARIANTS ---
const outDir = path.resolve('output/stormwreck-zone-finish-20261104');
console.log('Generando variante 1: Noche con estrellas y cementerio de pecios...');
fs.writeFileSync(path.join(outDir, 'scenic-variant-night-stars.png'), renderScenicVariant('night'));

console.log('Generando variante 2: Día costero con acantilados y pecios...');
fs.writeFileSync(path.join(outDir, 'scenic-variant-day-coastal.png'), renderScenicVariant('day'));

console.log('Generando variante 3: Temporal / Tormenta embravecida...');
fs.writeFileSync(path.join(outDir, 'scenic-variant-storm.png'), renderScenicVariant('storm'));

console.log('Todas las variantes generadas con éxito en output/stormwreck-zone-finish-20261104/');
