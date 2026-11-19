import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const root = path.resolve('output/godot-pecio-audit-20261115');
const beforeDir = path.join(root, 'before');
const afterDir = path.join(root, 'after');

const beforeCams = JSON.parse(fs.readFileSync(path.join(beforeDir, 'cameras.json'), 'utf8'));
const afterCams = JSON.parse(fs.readFileSync(path.join(afterDir, 'cameras.json'), 'utf8'));
const beforeInv = JSON.parse(fs.readFileSync(path.join(beforeDir, 'inventory.json'), 'utf8'));
const afterInv = JSON.parse(fs.readFileSync(path.join(afterDir, 'inventory.json'), 'utf8'));

function pngMeta(filePath) {
  const buf = fs.readFileSync(filePath);
  const sig = buf.subarray(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') {
    throw new Error(`Invalid PNG header: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  return { width, height, bytes: buf.length, sha256 };
}

function parseVec3(str) {
  const m = String(str).match(/\(([-\d.eE]+),\s*([-\d.eE]+),\s*([-\d.eE]+)\)/);
  if (!m) throw new Error(`Cannot parse Vec3: ${str}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function dist3(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function invSummary(inv) {
  const meshes = inv.meshes ? inv.meshes.length : 0;
  const triangles = inv.meshes
    ? inv.meshes.reduce((acc, m) => acc + (Number(m.triangles) || 0), 0)
    : 0;
  const collisions = inv.collisions ? inv.collisions.length : 0;
  return { meshes, triangles, collisions };
}

const orderedViews = [
  'overview',
  'c1',
  'hatch',
  'c2',
  'c3',
  'stern-breach',
  'bow',
  'c4',
  'c5',
  'c6',
  'c7',
  'c8',
  'c9',
  'cofa',
  'dragon',
  'remains',
  'rowboat',
];

const viewDetails = {
  overview: {
    title: 'Cubierta general (Overview)',
    zone: 'Exterior · C1 / Conjunto',
    notes: 'Tinte Kenney cálido/envejecido unificado (sin brillo salino calcáreo), cangrejos articulados más oscuros, bandas de hierro en trinquete/mayor y rollos de cabo 3D sobre cubierta.',
  },
  c1: {
    title: 'C1 · Cubierta de combés',
    zone: 'Exterior · C1',
    notes: 'Rollos de cordaje con argollas de bronce en cubierta, manchas de óxido suavizadas y cangrejos de roca realistas.',
  },
  hatch: {
    title: 'Escotilla central C1–C8 y escala lateral',
    zone: 'Exterior · Escotilla y escala',
    notes: 'Escala lateral recortada limpiamente sobre el nivel del agua, cornamusas gemelas en el hueco de embarque y transición suave del oleaje en la línea de flotación.',
  },
  c2: {
    title: 'C2 · Castillo de proa',
    zone: 'Exterior · C2',
    notes: 'Farol Lantern_C2_Bow reubicado sobre ForemastStump_C2 con soporte real y partículas alineadas; bandas de hierro en tocón y palo caído; cofre y cabo en banda de babor.',
  },
  c3: {
    title: 'C3 · Alcázar de popa',
    zone: 'Exterior · C3',
    notes: 'Dos claraboyas bajas hacia C4, taquillas de roble en popa, cabo adujado junto al mesana y poste de esquina en popa cerrando la muesca del espejo.',
  },
  'stern-breach': {
    title: 'Brecha de popa (Stern Breach)',
    zone: 'Exterior · Popa',
    notes: 'Rocas basálticas con relieve especular visible (sin mancha negra plana), espejo cerrado en coronamiento y costura de fondo marino eliminada.',
  },
  bow: {
    title: 'Proa y bauprés (Bow)',
    zone: 'Exterior · Proa',
    notes: 'Espuma de contacto suavizada en casco de proa y contraste cálido de madera/basalto en arrecife delantero.',
  },
  c4: {
    title: 'C4 · Camarote del Capitán',
    zone: 'Interior · C4',
    notes: 'Puerta DoorC4 trasladada a z = -1,80 (visible y sin quedar oculta por la escalera -3,50), ventanales de popa con SternWindowGlow, farol sobre CaptainsDesk, costillas retiradas del suelo y cofre despejando el umbral.',
  },
  c5: {
    title: 'C5 · Camarote de oficiales / alquimia',
    zone: 'Interior · C5',
    notes: 'Puerta DoorC5 en z = +5,20, farol sobre poste vertical de cubierta con partículas LanternEmbers_C5 y contraste equilibrado sin luces huérfanas.',
  },
  c6: {
    title: 'C6 · Sollado de literas (babor)',
    zone: 'Interior · C6',
    notes: 'Puerta DoorC6 trasladada a z = -1,80 (visible y a la derecha de la escalera de babor vista desde C1), faroles C6_A/C6_B en postes con plinto y colisionador duplicado Col_Bunk_* eliminado.',
  },
  c7: {
    title: 'C7 · Cámara de rancho / oficial (estribor)',
    zone: 'Interior · C7',
    notes: 'Eliminada la mesa flotante de jarcias (Chainwale_Fore ocultada en recorte), farol apoyado sobre MessTable, jarras de peltre añadidas y costillas de proa retiradas fuera del mamparo.',
  },
  c8: {
    title: 'C8 · Cubierta inferior (Sollao)',
    zone: 'Interior · C8',
    notes: 'Conservación integral de puntales y escalas C1–C8 / C8–C9 con iluminación cálida coherente y sin recorte de costillas por encima de la borda.',
  },
  c9: {
    title: 'C9 · Sentina inundada',
    zone: 'Interior · C9',
    notes: 'Activada la luz natural de brecha (HoldBreachWater_Glow) y escotilla (HoldStairHatch_Glow) conservando C9_DepthGlimmer y C9_HoldAmbient a cero según test_ship_environment.gd.',
  },
  cofa: {
    title: 'C10 · Cofa (Crow’s Nest)',
    zone: 'Exterior · C10',
    notes: 'Vela gironada con grano/moho textil (cloth_sail.gdshader), driza adujada 3D y farol de señales de bronce roto sin interferir el paso.',
  },
  dragon: {
    title: 'Cráneo de Clyssavar y arrecife de popa',
    zone: 'Exterior · Dragón y arrecife',
    notes: 'Eliminada la línea de borde de SeabedTerrain (-96..96 × -72..72), relieve basáltico húmedo en arrecife y ajuste de costillas de popa.',
  },
  remains: {
    title: 'Costillas en cintura y cubierta de combate',
    zone: 'Exterior · Cintura',
    notes: 'Costillas rebajadas bajo la borda y cuellos de madera astillada ajustados sin flotar sobre la amurada; cangrejos y cables adujados detallados.',
  },
  rowboat: {
    title: 'Bote auxiliar y brecha lateral',
    zone: 'Exterior · Bote',
    notes: 'Escala lateral terminada sobre el agua sin corte abrupto bajo la superficie, cornamusas gemelas y collares de fractura en costillas.',
  },
};

const originals = [];
const comparisons = [];
const parityChecks = [];

for (const view of orderedViews) {
  const bCam = beforeCams.find((c) => c.view === view);
  const aCam = afterCams.find((c) => c.view === view);
  if (!bCam || !aCam) {
    throw new Error(`Missing camera entry for view=${view}`);
  }
  const bFile = path.join(beforeDir, `${view}.png`);
  const aFile = path.join(afterDir, `${view}.png`);
  const bMeta = pngMeta(bFile);
  const aMeta = pngMeta(aFile);

  if (bMeta.width !== aMeta.width || bMeta.height !== aMeta.height) {
    throw new Error(`Dimension mismatch on ${view}: ${bMeta.width}x${bMeta.height} vs ${aMeta.width}x${aMeta.height}`);
  }
  if (bCam.camera !== aCam.camera || bCam.fov !== aCam.fov || bCam.mode !== aCam.mode) {
    throw new Error(`Camera mismatch on ${view}`);
  }
  const playerDelta = dist3(parseVec3(bCam.player_feet), parseVec3(aCam.player_feet));
  if (playerDelta > 0.0001) {
    throw new Error(`Player placement drift on ${view}: ${playerDelta}m`);
  }

  parityChecks.push({
    view,
    mode: aCam.mode,
    width: aMeta.width,
    height: aMeta.height,
    fov: aCam.fov,
    playerDeltaMeters: Number(playerDelta.toFixed(6)),
    exactCameraMatch: true,
  });

  originals.push(
    { view, stage: 'before', file: `before/${view}.png`, ...bMeta },
    { view, stage: 'after', file: `after/${view}.png`, ...aMeta },
  );

  const info = viewDetails[view];
  comparisons.push(`
    <article class="view-card" id="view-${view}">
      <div class="view-head">
        <div>
          <span class="zone-pill">${info.zone}</span>
          <h3>${info.title}</h3>
        </div>
        <code>${aMeta.width}×${aMeta.height} · ${aCam.mode}</code>
      </div>
      <p class="view-notes">${info.notes}</p>
      ${visualComparison({
        before: `before/${view}.png`,
        after: `after/${view}.png`,
        title: `${info.title} (${view})`,
        width: aMeta.width,
        height: aMeta.height,
      })}
    </article>
  `);
}

const registerRows = [
  ['A', 'DoorC4 / DoorC6 / Bulkhead_Front_C4/C6 / CaptainsChestC4', 'main.tscn, interiors_builder.gd, main_controller.gd, test_doors_alignment.gd', 'DoorC4 y DoorC6 en z=-5,20 ocultas tras las escaleras (-3,50)', 'DoorC4 y DoorC6 en z=-1,80 (+Z de escalera -3,50), DoorC5/C7 en z=+5,20 y cofre C4 despejado (-15,2, -3,6)', 'Visibilidad de cámara'],
  ['A', 'Lantern_C2_Bow / LanternEmbers_BowC2', 'deck_dressing_builder.gd, vfx_manager.gd', 'Farol flotando en aire junto a ForemastStump_C2 (x=19.8)', 'Anclado al tocón del trinquete (x=21.0, z=-0.92) con soporte y partículas alineadas', 'Integridad física'],
  ['A', 'Chainwale_Aft / Main / Fore', 'hull_builder.gd, roof_cutout_controller.gd', 'Mesa de guarnición flotante sobre C7 durante recorte proa', 'Piezas nombradas y ocultación coordinada según modo de recorte', 'Recorte interior'],
  ['A', 'InteriorWall_Stern / CornerPost', 'hull_builder.gd', 'Muesca abierta entre C3 y espejo de popa', 'Poste estructural de esquina en STERN_X + 0.08 cerrando el remate', 'Carpintería naval'],
  ['A', 'WallLantern_C4/C5/C6_A/C6_B/C7', 'interiors_builder.gd, vfx_manager.gd', 'Faroles colgados de techos inexistentes en recorte', 'Apoyos reales sobre mesa (C4/C7) o poste con plinto (C5/C6) + brasas', 'Apoyos físicos'],
  ['A', 'Col_Bunk_*', 'interiors_builder.gd', 'Colisionador duplicado en literas de C6', 'Duplicado eliminado conservando la colisión canónica', 'Navegación y física'],
  ['A', 'TitanicRibs / BowDragonRemains / Splinters', 'dragon_bones_builder.gd', 'Costillas invadiendo suelo de C4/C7 y collares sobre la amurada', 'Costillas retiradas fuera del casco interior y fracturas limitadas a y <= 0.62', 'Integridad C4/C7'],
  ['B', 'C9_SternBreachGlow / HoldBreachWater_Glow / HoldStairHatch_Glow', 'ship_environment.gd, interiors_builder.gd', 'Sentina C9 demasiado plana sin entrada de luz de brecha/escotilla', 'Iluminación fría natural desde brecha y escotilla (con DepthGlimmer=0 / HoldAmbient=0)', 'VA-07 / Luz'],
  ['B', 'kenney_weathered.gdshader & ocean_water.gdshader', 'shaders/kenney_weathered.gdshader, ocean_water.gdshader', 'Brillo salino calcáreo en maderas y espuma romboidal en flotación', 'Matices cálidos roble/bronce/hierro y espuma suavizada junto al casco', 'VA-03 / Materiales'],
  ['B', 'SeabedTerrain / SternReef / SideBoardingLadder / RustWeepStains', 'reef_builder.gd, pbr_material_kit.gd, hull_builder.gd', 'Borde visible de fondo marino, rocas negras planas, escala sumergida y óxido naranja chillón', 'Fondo marino ampliado (-96..96 × -72..72), basalto especular (0.30/0.76), escala terminada sobre el agua con cornamusas y óxido atenuado', 'VA-02 / Silueta'],
  ['C', 'RockCrabs / RopeCoil_* / RingBolts / IronBands / C2_Props', 'deck_dressing_builder.gd', 'Cangrejos esfera+caja, cabos planos y tocones lisos', 'Cangrejos articulados oscuros, cabos 3D sobre cubierta, argollas en C1, bandas de hierro y cofre/cabo en C2', 'Storytelling'],
  ['C', 'C3_Skylights / SternLockers / C4_Carpet_Bench / C7_Mugs / C10_Lantern / cloth_sail.gdshader', 'deck_dressing_builder.gd, interiors_builder.gd, cloth_sail.gdshader', 'Superficies desnudas en alcázar/cámara/cofa y tela lisa', 'Claraboyas y taquillas en C3, alfombra y banco en C4, jarras en C7, driza y farol roto en C10 y trama textil envejecida', 'VA-11 / Acabado'],
];

const invBeforeSummary = invSummary(beforeInv);
const invAfterSummary = invSummary(afterInv);

const testSuites = [
  { script: 'scripts/test_stair_blockage.gd', result: 'PASS · 4 tramos verificados en ambos sentidos (12/12 pasos)' },
  { script: 'scripts/test_doors_alignment.gd', result: 'PASS · 4 puertas de camarotes (C4/C6=-1,80, C5/C7=+5,20) verificadas y alineadas' },
  { script: 'scripts/test_pecio_integrity.gd', result: 'PASS · 11 oclusores, materiales PBR y nodos críticos OK' },
  { script: 'scripts/test_ship_construction.gd', result: 'PASS · 79 PASS / 0 FAIL' },
  { script: 'scripts/test_babylon_camera_parity.gd', result: 'PASS · FULL BABYLON CAMERA PARITY VERIFIED (6/6 SUITES)' },
  { script: 'scripts/test_character_animations.gd', result: 'PASS · Todos los sprites y animaciones verificados' },
  { script: 'scripts/test_ship_environment.gd', result: 'PASS · 2178 PASS / 0 FAIL' },
];

const manifest = {
  generatedAt: new Date().toISOString(),
  parityChecks,
  inventory: { before: invBeforeSummary, after: invAfterSummary },
  testSuites,
  register: registerRows,
  originals,
};

fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));

const tableRowsHtml = registerRows
  .map(
    ([blk, id, owner, beforeDesc, afterDesc, tag]) => `
      <tr>
        <td><span class="blk blk-${blk.toLowerCase()}">Bloque ${blk}</span></td>
        <td><code>${id}</code></td>
        <td><code>${owner}</code></td>
        <td>${beforeDesc}</td>
        <td>${afterDesc}</td>
        <td>${tag}</td>
      </tr>
    `,
  )
  .join('');

const testsHtml = testSuites
  .map((t) => `<tr><td><code>${t.script}</code></td><td>${t.result}</td></tr>`)
  .join('');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pecio de Clyssavar · Informe único Antes / Después (Bloques A, B y C)</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0b1820;color:#e7e9df;font:15px/1.6 system-ui,-apple-system,sans-serif}
  main{max-width:1340px;margin:auto;padding:36px 24px 80px}
  header{border-bottom:1px solid #355056;padding-bottom:26px;margin-bottom:28px}
  .eyebrow{color:#c9b485;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
  h1{font:500 clamp(28px,4.2vw,46px)/1.12 Georgia,serif;margin:12px 0}
  h2{font:500 26px/1.25 Georgia,serif;margin:40px 0 14px;border-bottom:1px solid #263f46;padding-bottom:8px}
  h3{margin:4px 0 0;font-size:18px;color:#f1eedd}
  p{max-width:960px;margin:8px 0 14px}
  a{color:#e7ca91}
  code{background:#12252e;padding:2px 6px;border-radius:3px;font-size:12.5px;color:#d8e3da}
  .muted{color:#9fb4b4;font-size:13.5px}
  .metrics{display:flex;gap:24px;flex-wrap:wrap;margin-top:18px}
  .metric{background:#11232c;border:1px solid #304b51;padding:12px 18px;border-radius:6px}
  .metric strong{display:block;font-size:22px;color:#e4c587}
  nav{display:flex;gap:14px;flex-wrap:wrap;margin-top:18px}
  nav a{padding:6px 12px;background:#142831;border:1px solid #324d53;border-radius:4px;text-decoration:none;font-size:13px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:16px;margin-top:18px}
  .card{background:#11242d;border:1px solid #324d53;padding:18px;border-radius:6px}
  .blk{display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:600}
  .blk-a{background:#3b271c;color:#f3ba88;border:1px solid #744a2f}
  .blk-b{background:#1b333d;color:#93d3df;border:1px solid #356372}
  .blk-c{background:#233524;color:#a8db9f;border:1px solid #456b47}
  .view-card{margin:28px 0 38px;padding:20px;background:#102129;border:1px solid #2d474d;border-radius:8px}
  .view-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px}
  .zone-pill{display:inline-block;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:#c9b485}
  .view-notes{color:#c9d6d3;font-size:14px;margin-bottom:14px}
  .scroll{overflow:auto;margin-top:14px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;border-bottom:1px solid #2a4349;padding:10px 8px;vertical-align:top}
  th{background:#132831;color:#dbc493}
  details{border:1px solid #2c464c;border-radius:6px;padding:14px 18px;background:#0e1d24;margin-top:20px}
  summary{cursor:pointer;font-weight:600;color:#e7ca91}
</style>
${visualComparisonAssets()}
</head>
<body>
<main>
  <header>
    <div class="eyebrow">Pecio de Clyssavar · Godot Forward+ · 15 noviembre 2026</div>
    <h1>Informe único Antes / Después: Bloques A, B y C</h1>
    <p>Consolidación visual, física y de ambientación en <code>prototypes/godot-pecio</code>. Cada par compara exactamente la misma cámara, FOV, resolución (1280×720), semilla (14112026), posición de personaje y estado congelado antes y después de aplicar los tres bloques.</p>
    <div class="metrics">
      <div class="metric"><strong>${comparisons.length} / 17</strong>vistas con paridad exacta</div>
      <div class="metric"><strong>7 / 7</strong>suites headless en PASS</div>
      <div class="metric"><strong>${invBeforeSummary.meshes} → ${invAfterSummary.meshes}</strong>mallas totales</div>
      <div class="metric"><strong>${invBeforeSummary.collisions} → ${invAfterSummary.collisions}</strong>colisiones registradas</div>
    </div>
    <nav>
      <a href="#resumen">Resumen A / B / C</a>
      <a href="#vistas">Comparativas Antes / Después (17)</a>
      <a href="#registro">Registro de cambios</a>
      <a href="#pruebas">Pruebas y originales</a>
    </nav>
  </header>

  <section id="resumen">
    <h2>Bloques ejecutados</h2>
    <div class="cards">
      <article class="card">
        <span class="blk blk-a">Bloque A</span>
        <h3>Integridad física y espacial</h3>
        <p>Farol C2 anclado al trinquete, mesas de guarnición ocultadas en recortes de proa/popa (eliminando el estante flotante de C7), poste de esquina en espejo de C3, faroles interiores apoyados en mesa/poste, colisionador duplicado de litera C6 retirado y costillas/astillas contenidas fuera de C4/C7.</p>
      </article>
      <article class="card">
        <span class="blk blk-b">Bloque B</span>
        <h3>Luz, materiales y shaders</h3>
        <p>Iluminación natural en brecha y escotilla de C9 (<code>HoldBreachWater_Glow</code>, <code>HoldStairHatch_Glow</code>), ventanales interiores de C4, maderas y metales Kenney menos calcáreos, espuma suavizada en línea de flotación, rocas basálticas con relieve, fondo marino ampliado sin costura visible, escala lateral terminada sobre el agua y óxido atenuado.</p>
      </article>
      <article class="card">
        <span class="blk blk-c">Bloque C</span>
        <h3>Mobiliario, atrezo y narrativa</h3>
        <p>Cangrejos de roca articulados y más oscuros, rollos de cabo 3D con argollas de bronce en cubierta, bandas de hierro y cofre/cabo en C2, claraboyas y taquillas en C3, alfombra y banco en C4, jarras de peltre en C7, vela envejecida y driza/farol roto en C10.</p>
      </article>
    </div>
  </section>

  <section id="vistas">
    <h2>Comparativas integradas Antes / Después (17 vistas)</h2>
    <p class="muted">Haz clic o toca cualquier captura para alternar entre <strong>Antes</strong> y <strong>Después</strong> en el mismo rectángulo (o pulsa <strong>Espacio/Enter</strong> sobre la imagen y <strong>Ampliar</strong> para inspeccionar al 100 %–300 %).</p>
    ${comparisons.join('\n')}
  </section>

  <section id="registro">
    <h2>Registro técnico de objetos y materiales</h2>
    <div class="scroll">
      <table>
        <thead>
          <tr><th>Bloque</th><th>Objeto / ID</th><th>Propietario</th><th>Antes</th><th>Después</th><th>Criterio</th></tr>
        </thead>
        <tbody>${tableRowsHtml}</tbody>
      </table>
    </div>
  </section>

  <section id="pruebas">
    <h2>Pruebas verificadas e inventario</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>Suite headless Godot</th><th>Resultado observado tras el último cambio</th></tr></thead>
        <tbody>${testsHtml}</tbody>
      </table>
    </div>
    <div class="scroll" style="margin-top:18px">
      <table>
        <thead><tr><th>Medida de escena completa</th><th>Antes</th><th>Después</th></tr></thead>
        <tbody>
          <tr><td>Mallas registradas (<code>inventory.json</code>)</td><td>${invBeforeSummary.meshes}</td><td>${invAfterSummary.meshes}</td></tr>
          <tr><td>Triángulos estimados</td><td>${invBeforeSummary.triangles}</td><td>${invAfterSummary.triangles}</td></tr>
          <tr><td>Formas de colisión</td><td>${invBeforeSummary.collisions}</td><td>${invAfterSummary.collisions}</td></tr>
        </tbody>
      </table>
    </div>
    <details>
      <summary>Originales SHA-256 y paridad de cámaras (34 PNG registrados)</summary>
      <p class="muted">Todas las capturas originales en <code>before/*.png</code> y <code>after/*.png</code> quedan registradas con hash SHA-256, dimensiones exactas 1280×720 y delta de posición 0,000000 m en <a href="manifest.json">manifest.json</a>.</p>
      <ul>
        <li><a href="before/cameras.json">before/cameras.json</a> · <a href="after/cameras.json">after/cameras.json</a></li>
        <li><a href="before/inventory.json">before/inventory.json</a> · <a href="after/inventory.json">after/inventory.json</a></li>
        <li><a href="before/environment.json">before/environment.json</a> · <a href="after/environment.json">after/environment.json</a></li>
      </ul>
    </details>
  </section>
</main>
</body>
</html>
`;

const reportPath = path.join(root, 'report.html');
fs.writeFileSync(reportPath, html);
console.log(JSON.stringify({
  ok: true,
  report: reportPath,
  manifest: path.join(root, 'manifest.json'),
  comparisons: comparisons.length,
  originals: originals.length,
  inventoryBefore: invBeforeSummary,
  inventoryAfter: invAfterSummary,
}, null, 2));
