import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { visualComparison, visualComparisonAssets } from "./lib/visual-comparison.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "output", "pecio-c1-c3-20261118");

const COMPARISONS = [
  {
    id: "c3_main",
    title: "C3 · Puesto de mando (Vista 3/4 jugable)",
    subtitle: "Tablazón húmeda negro-verdosa con variación por tablón, timón torcido y desencajado, tocón astillado de mesana como lanza rota, algas, percebes y detalles narrativos despejando el paso central.",
    va: "VA-03, VA-05, VA-08, VA-11, VA-14",
  },
  {
    id: "c3_helm_detail",
    title: "C3 · Detalle del timón e inscripción «Rosa de los Vientos» boca abajo",
    subtitle: "Aro exterior, radios torneados, cubo y eje corroído a punto de ceder; cartela con «Rosa de los Vientos» incrustada en nácar envejecido e invertida 180° según el PDF.",
    va: "VA-03, VA-08, VA-12, VA-15",
  },
  {
    id: "c3_top",
    title: "C3 · Puesto de mando (Planta superior de lectura táctica)",
    subtitle: "Continuidad de juntas sin costuras falsas, oclusión ambiental de contacto y zona central transitable hacia las escaleras y C4.",
    va: "VA-01, VA-05, VA-11",
  },
  {
    id: "cofa_main",
    title: "C1 · Cofa de la arpía / Subzona C1 (+15 m, Vista 3/4 isométrica)",
    subtitle: "Encuentro reparado mástil-plataforma con penol astillado, canasta irregular de ramas y fibras, virutas en bordes, lecho de hierba seca, jirones de vela, huesos, mechones, baratijas y los 4 tesoros del PDF.",
    va: "VA-03, VA-05, VA-08, VA-11, VA-14",
  },
  {
    id: "cofa_top",
    title: "C1 · Cofa de la arpía (Planta superior jugable)",
    subtitle: "Anillo interior transitable para combate y exploración, muesca de entrada libre de colisiones de barandilla e integración discreta del botín sin duplicaciones.",
    va: "VA-01, VA-05, VA-12",
  },
  {
    id: "cofa_side",
    title: "C1 · Cofa de la arpía (Vista lateral: escala de cuerda de 15 m y refuerzos)",
    subtitle: "Escala colgante de cuerda y peldaños de roble ascendiendo hasta la muesca abierta, curvas estructurales inferiores, trincas de cabo, algas y percebes exteriores.",
    va: "VA-03, VA-08, VA-14",
  },
  {
    id: "overview",
    title: "Conjunto del Pecio «El Rosa de los Vientos» (Coherencia global C1 + C3)",
    subtitle: "Coherencia cromática y de materiales entre el puesto de mando en popa (C3), la cubierta principal (C1) y la cofa del palo mayor (+15 m).",
    va: "VA-01, VA-03, VA-05, VA-11",
  },
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function pngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.length,
  };
}

const beforeCamerasPath = path.join(outDir, "before", "cameras.json");
const afterCamerasPath = path.join(outDir, "after", "cameras.json");
const beforeCameras = fs.existsSync(beforeCamerasPath) ? JSON.parse(fs.readFileSync(beforeCamerasPath, "utf8")) : [];
const afterCameras = fs.existsSync(afterCamerasPath) ? JSON.parse(fs.readFileSync(afterCamerasPath, "utf8")) : [];

const records = COMPARISONS.map((item) => {
  const beforeRel = `before/${item.id}.png`;
  const afterRel = `after/${item.id}.png`;
  const beforeAbs = path.join(outDir, beforeRel);
  const afterAbs = path.join(outDir, afterRel);
  if (!fs.existsSync(beforeAbs) || !fs.existsSync(afterAbs)) {
    throw new Error(`Missing comparison image for ${item.id}: ${beforeAbs} / ${afterAbs}`);
  }
  const bMeta = pngDimensions(beforeAbs);
  const aMeta = pngDimensions(afterAbs);
  const bHash = sha256(beforeAbs);
  const aHash = sha256(afterAbs);
  const cam = afterCameras.find((c) => c.view === item.id || c.id === item.id) || beforeCameras.find((c) => c.view === item.id || c.id === item.id) || null;
  return {
    ...item,
    before: { path: beforeRel, sha256: bHash, ...bMeta },
    after: { path: afterRel, sha256: aHash, ...aMeta },
    identical: bHash === aHash,
    camera: cam,
  };
});

const manifest = {
  generatedAt: new Date().toISOString(),
  campaign: "El Pecio de la Rosa de los Vientos (Capítulo 3, págs. 23–24)",
  renderer: "Godot 4.7.2 Forward+ (Vulkan)",
  resolution: "1280x720",
  comparisons: records,
};

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

const cardsHtml = records
  .map((r) => {
    const compWidget = visualComparison({
      before: r.before.path,
      after: r.after.path,
      title: r.title,
      beforeLabel: "Antes (base)",
      afterLabel: "Después (mejora C1/C3)",
      width: r.after.width,
      height: r.after.height,
    });
    const camText = r.camera
      ? `pos=(${(r.camera.pos || r.camera.position).map((n) => Number(n).toFixed(2)).join(", ")}) · look=(${(r.camera.look || r.camera.target).map((n) => Number(n).toFixed(2)).join(", ")}) · fov=${r.camera.fov}°`
      : "1280×720 perspectiva fija";
    return `
    <section class="card" id="view-${r.id}">
      <div class="card-head">
        <div>
          <span class="badge">${r.va}</span>
          <h2>${r.title}</h2>
          <p>${r.subtitle}</p>
        </div>
        <div class="meta-box">
          <div><strong>Cámara:</strong> <code>${camText}</code></div>
          <div><strong>SHA-256 Antes:</strong> <code>${r.before.sha256.slice(0, 16)}…</code></div>
          <div><strong>SHA-256 Después:</strong> <code>${r.after.sha256.slice(0, 16)}…</code></div>
        </div>
      </div>
      ${compWidget}
    </section>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pecio del Rosa de los Vientos — Informe Antes / Después (C1 Cofa y C3 Puesto de Mando)</title>
  ${visualComparisonAssets()}
  <style>
    :root {
      color-scheme: dark;
      --bg: #081116;
      --panel: #0e1c24;
      --border: rgba(198, 168, 98, 0.34);
      --gold: #e6c779;
      --ink: #ecf2f3;
      --muted: #9cb0b5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 22px 60px;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: radial-gradient(circle at 50% 0%, #132833 0%, var(--bg) 70%);
      color: var(--ink);
      max-width: 1360px;
      margin-inline: auto;
    }
    header {
      border: 1px solid var(--border);
      background: rgba(12, 25, 32, 0.9);
      border-radius: 14px;
      padding: 22px 26px;
      margin-bottom: 24px;
    }
    h1 { margin: 0 0 8px; font-size: 1.65rem; color: var(--gold); }
    header p { margin: 6px 0; color: var(--muted); line-height: 1.5; }
    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 26px;
      box-shadow: 0 14px 36px rgba(0,0,0,0.42);
    }
    .card-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 14px;
    }
    .card-head h2 { margin: 6px 0; font-size: 1.2rem; color: var(--gold); }
    .card-head p { margin: 4px 0 0; color: var(--muted); max-width: 780px; font-size: 0.94rem; }
    .badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 0.75rem;
      background: rgba(230, 199, 121, 0.14);
      border: 1px solid var(--border);
      color: var(--gold);
    }
    .meta-box {
      font-size: 0.78rem;
      color: var(--muted);
      background: rgba(5, 12, 16, 0.65);
      border: 1px solid rgba(255,255,255,0.08);
      padding: 10px 12px;
      border-radius: 8px;
      line-height: 1.55;
    }
    .vc-card { max-width: 100%; }
  </style>
</head>
<body>
  <header>
    <h1>Pecio del Rosa de los Vientos — Mejoras de C3 (Puesto de mando) y C1 (Cofa de la arpía)</h1>
    <p>Comparativa interactiva Antes / Después con la misma cámara, encuadre y resolución (1280×720, Godot 4.7.2 Forward+). Haz clic o toca cualquier imagen para alternar entre <strong>Antes</strong> y <strong>Después</strong> en el mismo rectángulo, o usa el botón <strong>Ampliar</strong> y la rueda para inspeccionar detalles al 400%.</p>
  </header>
  ${cardsHtml}
</body>
</html>`;

fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
console.log("Built interactive visual comparison report:", path.join(outDir, "index.html"));
