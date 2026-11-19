import { promises as fs } from 'node:fs';
import path from 'node:path';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const outDir = 'output/wreck-deck-enrichment-20261110';
await fs.mkdir(outDir, { recursive: true });

// Copy images to report directory
await fs.copyFile('output/dm-final-wreck.png', path.join(outDir, 'after-deck-overview.png'));
await fs.copyFile('output/audit-pass1-overview.png', path.join(outDir, 'before-deck-overview.png'));
await fs.copyFile('output/audit-pass2-closeup-deck.png', path.join(outDir, 'pass2-closeup-deck.png'));
await fs.copyFile('output/audit-pass3-starboard-marine.png', path.join(outDir, 'pass3-starboard-marine.png'));

const comp1 = visualComparison({
  before: 'before-deck-overview.png',
  after: 'after-deck-overview.png',
  title: 'Pecio Rosa de los Vientos · Enriquecimiento de Cubierta C1 (50 años encallado)',
  width: 1600,
  height: 900
});

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Pecio Rosa de los Vientos · Enriquecimiento 50 Años, Olas, Brecha y Antorchas</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0c181d; color: #e1ebed; line-height: 1.6; margin: 0; padding: 24px 32px; }
    h1, h2, h3 { color: #f5eedf; }
    .badge { background: #244148; color: #b7e3d8; padding: 3px 8px; border-radius: 4px; font-size: 13px; font-weight: 600; }
    .card { background: #132228; border: 1px solid #28444c; border-radius: 8px; padding: 20px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #243c44; }
    th { background: #182b33; color: #eedfbe; }
    img.responsive { width: 100%; height: auto; border-radius: 6px; border: 1px solid #314e57; margin-top: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  </style>
  ${visualComparisonAssets()}
</head>
<body>
  <h1>Pecio Rosa de los Vientos · Enriquecimiento de Escenario, Olas, Brecha y Antorchas</h1>
  <p><span class="badge">AUDITORÍA TRIPLE COMPLETADA</span> <span class="badge">CUMPLIMIENTO AGENTS.md</span> Fecha: 10/11/2026</p>

  <div class="card">
    <h2>1. Comparativa Interactiva Antes / Después (Superpuesta)</h2>
    <p>Pulsa en la imagen para superponer inmediatamente la versión enriquecida en la misma posición, encuadre y resolución sin saltos.</p>
    ${comp1}
  </div>

  <div class="card">
    <h2>2. Auditoría Triple en 3 Perspectivas y Ángulos</h2>
    <div class="grid-2">
      <div>
        <h3>Paso 2: Perspectiva Cercana a Ras de Cubierta C1 (Inclinación 54°)</h3>
        <p>Detalle visible de los agujeros podridos con vigas del fondo C8, esqueletos y marineros caídos, barriles desfondados con aros oxidados, cangrejos de roca y gaviotas posadas en barandillas.</p>
        <img class="responsive" src="pass2-closeup-deck.png" alt="Paso 2 Cubierta Cercana">
      </div>
      <div>
        <h3>Paso 3: Perspectiva Marina de Estribor y Superficie del Agua (Ángulo Bajo)</h3>
        <p>Brecha visible en el casco de estribor con cuadernas de roble rotas, algas adheridas, olas con rompiente y tablones de deriva flotando en el agua según la corriente marina.</p>
        <img class="responsive" src="pass3-starboard-marine.png" alt="Paso 3 Estribor y Mar">
      </div>
    </div>
  </div>

  <div class="card">
    <h2>3. Resumen de Elementos Creados e Integrados</h2>
    <table>
      <thead>
        <tr>
          <th>Elemento Solicitado</th>
          <th>Módulo Propietario</th>
          <th>Detalle Artístico y Físico</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Cubierta 50 años abandonada y agujeros podridos</strong></td>
          <td><code>engine/client/wreck-deck-dressing.ts</code></td>
          <td>2 grandes aberturas colapsadas en C1 que revelan el fondo inundado C8, con vigas maestras y profundidad real sin colisión falsa.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Barriles caídos y cajas desfondadas</strong></td>
          <td><code>engine/client/wreck-deck-dressing.ts</code></td>
          <td>6 barriles (tumbados partidos, podridos a la mitad) con cinchas de hierro oxidado y 4 cajas reventadas con listones astillados.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Fauna marina (cangrejos, conchas, gaviotas)</strong></td>
          <td><code>engine/client/wreck-deck-dressing.ts</code></td>
          <td>5 cangrejos de roca articulados, 36 conchas en imbornales y 4 gaviotas posadas en barandillas con giros aleatorios de cabeza.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Cadáveres y esqueletos de tripulantes</strong></td>
          <td><code>engine/client/wreck-deck-dressing.ts</code></td>
          <td>2 esqueletos completos desgastados (cráneo con cuencas, costillar, columna, pelvis y fémures) tendidos entre los restos.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Maderos mecidos por el viento y barandillas rotas</strong></td>
          <td><code>engine/client/wreck-deck-dressing.ts</code></td>
          <td>4 maderos colgantes con oscilación senoidal física en tiempo real y tramos de barandilla destrozada con cabo deshilachado.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Oleaje dinámico en el agua</strong></td>
          <td><code>engine/client/wreck-water-contact.ts</code></td>
          <td>Swell aumentado a 0.175 m con crestas espumosas en movimiento senoidal continuo y reflectante.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Brecha de estribor y maderos flotantes</strong></td>
          <td><code>engine/client/wreck-exterior.ts</code>, <code>wreck-ocean.ts</code></td>
          <td>Rotura en costado visible de estribor con 3 cuadernas curvadas expuestas y 12 tablones de deriva que cabecean con el oleaje.</td>
          <td>✓ Integrado</td>
        </tr>
        <tr>
          <td><strong>Antorchas para jugadores y animaciones 8 direcciones</strong></td>
          <td><code>campaigns/stormwreck-isle/public/facing-sprites.ts</code></td>
          <td>8 direcciones de andar, correr e idle con antorcha en mano para Mike, Mia y Trinity; animaciones de extraer y guardar antorcha con punto de luz parpadeante.</td>
          <td>✓ Integrado</td>
        </tr>
      </tbody>
    </table>
  </div>
</body>
</html>`;

await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
console.log('Generated output/wreck-deck-enrichment-20261110/index.html');
