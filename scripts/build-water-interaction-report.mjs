import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const outputDir = path.resolve('output/stormwreck-zone-finish-20261104');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function getPng(filename) {
  const bytes = fs.readFileSync(path.join(outputDir, filename));
  return {
    filename,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
    sha256: hash(bytes)
  };
}

const comparisons = [
  {
    id: 'c1-cubierta-dia',
    title: 'C1 · Cubierta y Borda · Encuentro con el Mar (Día)',
    desc: 'Espuma blanca cremosa (#e8f8f5) y rompiente ampliada a 1.45 m a estribor / 1.15 m a babor. La onda de oleaje sube de 4.7 cm a ~19.5 cm con oscilación trocoidal.',
    before: 'wreck-ship-c1-day-before.png',
    after: 'wreck-ship-c1-day-after.png'
  },
  {
    id: 'c1-cubierta-noche',
    title: 'C1 · Cubierta y Borda · Encuentro con el Mar (Noche)',
    desc: 'Espuma marina nocturna bajo luz de luna, con contraste atenuado y reflejo frío en el casco.',
    before: 'wreck-ship-c1-night-before.png',
    after: 'wreck-ship-c1-night-after.png'
  },
  {
    id: 'c2-proa-dia',
    title: 'C2 · Proa y Trinquete · Choque con el Arrecife (Día)',
    desc: 'Corona de rompiente ensanchada a 1.65 m sobre las rocas del arrecife. Mástil y lona quebrada cayendo sobre aguas con cáusticas procedimentales.',
    before: 'wreck-ship-c2-day-before.png',
    after: 'wreck-ship-c2-day-after.png'
  },
  {
    id: 'c3-popa-dia',
    title: 'C3 · Popa y Clyssavar · Costillas del Dragón en el Mar (Día)',
    desc: 'Collar de espuma viva de 0.85 m alrededor de cada arco costal del dragón de oro (antes 0.34 m). Los huesos ya no cortan el agua en seco.',
    before: 'wreck-ship-c3-day-before.png',
    after: 'wreck-ship-c3-day-after.png'
  },
  {
    id: 'c8-bodega-dia',
    title: 'C8 · Bodega Inundada · Nivel de Agua Interna (Día)',
    desc: 'Gradiente de agua turbia (15–45 cm) con oleaje contenido que no rebasa los peldaños físicos de subida a C1.',
    before: 'wreck-ship-c8-day-before.png',
    after: 'wreck-ship-c8-day-after.png'
  },
  {
    id: 'c9-panol-dia',
    title: 'C9 · Pañol Sumergido · Profundidad Marina y Brecha (Día)',
    desc: 'Inmersión a -2.78 m con salida submarina P16 al océano abierto.',
    before: 'wreck-ship-c9-day-before.png',
    after: 'wreck-ship-c9-day-after.png'
  },
  {
    id: 'cofa-dia',
    title: 'Cofa · Palo Mayor (+15 m) · Panorámica del Arrecife (Día)',
    desc: 'Perspectiva cenital donde se aprecian las coronas de espuma blanca rodeando el perímetro del casco, los espolones rocosos y las cumbres de la isla.',
    before: 'wreck-ship-cofa-day-before.png',
    after: 'wreck-ship-cofa-day-after.png'
  }
];

const cardsHtml = comparisons.map(c => {
  const meta = getPng(c.before);
  const comp = visualComparison({
    before: c.before,
    after: c.after,
    title: c.title,
    width: meta.width,
    height: meta.height
  });
  return `
    <article class="report-card" id="${c.id}">
      <h3>${c.title}</h3>
      <p class="report-desc">${c.desc}</p>
      ${comp}
    </article>
  `;
}).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pecio Rosa de los Vientos · Informe Visual de Interacción Mar-Objetos</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0f1c22;
      color: #ececdf;
      font: 16px/1.6 system-ui, -apple-system, sans-serif;
    }
    main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    header {
      border-bottom: 1px solid #365057;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    h1 {
      font-family: Georgia, serif;
      color: #ead0a0;
      font-size: 32px;
      margin: 0 0 8px;
    }
    h2, h3 {
      font-family: Georgia, serif;
      color: #ead0a0;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
      background: #1b3840;
      color: #92d4c0;
      border: 1px solid #3f6874;
    }
    .note {
      padding: 16px;
      background: #172c33;
      border-left: 4px solid #dab876;
      border-radius: 4px;
      margin: 18px 0;
    }
    .report-card {
      background: #15262d;
      border: 1px solid #37535b;
      border-radius: 6px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .report-card h3 {
      margin-top: 0;
      font-size: 20px;
      color: #f5eedb;
    }
    .report-desc {
      font-size: 14px;
      color: #a9c1bd;
      margin-bottom: 16px;
    }
    nav a {
      color: #badbcc;
      text-decoration: none;
      margin-right: 14px;
      font-size: 14px;
    }
    nav a:hover {
      text-decoration: underline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #37535b;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background: #1c323b;
      color: #ead0a0;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <nav>
        <a href="index.html#wreck-ship">← Informe General Zonas C1–C9</a>
        <a href="scenic-preview.html">← Vista Previa Matte Painting</a>
      </nav>
      <h1>Pecio Rosa de los Vientos · Interacción Mar y Objetos</h1>
      <p><span class="badge">ACTUALIZACIÓN VISUAL AAA</span> Rompiente de olas, espuma viva (#e8f8f5), collares de estela y oleaje trocoidal (VA-15 / VA-05).</p>
    </header>

    <div class="note">
      <strong>Mecanismo de comparación interactivo:</strong> Al pulsar sobre cualquier captura se superpone de inmediato la versión <strong>DESPUÉS</strong> sobre el mismo encuadre; al volver a pulsar regresa al <strong>ANTES</strong>. Pulsa <strong>«Ampliar»</strong> para abrir el modal con zoom del 100% al 300% y navegación con teclado (<kbd>Espacio</kbd> / <kbd>Enter</kbd> para alternar, <kbd>Esc</kbd> para cerrar).
    </div>

    <section>
      <h2>Resumen de Mejoras Aplicadas</h2>
      <table>
        <thead>
          <tr>
            <th>Elemento</th>
            <th>Estado Anterior</th>
            <th>Mejora Aplicada (Calidad AAA)</th>
            <th>Impacto Visual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Color y Opacidad de Espuma</strong></td>
            <td>Verde petróleo oscuro (#045, #14, #15), alfa ~0.3 (casi invisible).</td>
            <td>Espuma blanca marina cremosa (#e8f8f5) con resalte glint (#f5fffe), turbulencia celular y alfa de hasta 0.88.</td>
            <td>La espuma es brillante, viva y claramente distinguible del mar.</td>
          </tr>
          <tr>
            <td><strong>Amplitud de Oleaje</strong></td>
            <td>4.7 cm de oscilación senoidal estática.</td>
            <td>19.5 cm de oleaje trocoidal (swell atlántico + chop armónico) en <code>wreckWaveGLSL</code>.</td>
            <td>El agua tiene masa, ritmo oceánico y bate visiblemente contra el pecio.</td>
          </tr>
          <tr>
            <td><strong>Huesos de Dragón (Clyssavar)</strong></td>
            <td>Cinta de contacto de 0.34 m (~2 px a cámara de juego).</td>
            <td>Corona de rompiente ampliada a 0.85 m con turbulencia orgánica.</td>
            <td>Los arcos costales rompen el agua con una estela blanca natural en vez de corte duro.</td>
          </tr>
          <tr>
            <td><strong>Casco del Barco y Brecha</strong></td>
            <td>0.96 m estribor / 0.72 m babor.</td>
            <td>1.45 m estribor / 1.15 m babor con avance de ola y reflujo.</td>
            <td>El pecio se percibe verdaderamente encallado en el arrecife.</td>
          </tr>
          <tr>
            <td><strong>Rocas del Arrecife</strong></td>
            <td>0.75 m / 1.28 m.</td>
            <td>1.20 m / 1.65 m con salpicaduras en los espolones basálticos.</td>
            <td>Los arrecifes forman crestas de espuma que enmarcan la escena.</td>
          </tr>
          <tr>
            <td><strong>Barca de Abordaje</strong></td>
            <td>Corte de 0.68 m con partículas estáticas.</td>
            <td>Estela continua de 0.95 m en <code>ship-rowboat3d.ts</code>.</td>
            <td>La barca flota sobre el agua con estela perimetral.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section id="comparisons">
      <h2>Comparativa Interactiva Antes / Después</h2>
      ${cardsHtml}
    </section>

    <footer style="margin-top: 48px; padding-top: 20px; border-top: 1px solid #365057; font-size: 13px; color: #8ea7a3;">
      D&D 2.5D Immersive VTT · Stormwreck Isle Chapter 3 · Desarrollado conforme a <code>AGENTS.md</code> y <code>ROADMAP_V1.md</code>.
    </footer>
  </main>
  ${visualComparisonAssets()}
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'water-interaction-report.html'), html);
console.log('water-interaction-report.html generado con éxito.');
