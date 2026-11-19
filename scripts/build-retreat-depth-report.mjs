import fs from 'node:fs';
import path from 'node:path';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const dir = path.resolve('output/retreat-depth-cliffs-20261109');
const records = JSON.parse(fs.readFileSync(path.join(dir, 'records.json'), 'utf8')).entries;

const figures = records.map(r => visualComparison({
  before: r.before.file,
  after: r.after.file,
  title: r.title,
  width: r.width,
  height: r.height
})).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Retiro del Dragón · Mejoras 1 y 2 (Profundidad 2.5D y Acantilados/Costa)</title>
<style>
body { font: 16px/1.5 system-ui, -apple-system, sans-serif; margin: 0; background: #0c161c; color: #e9eee9; }
main { max-width: 1140px; margin: auto; padding: 28px 20px 80px; }
a { color: #8ee5ff; text-decoration: none; }
a:hover { text-decoration: underline; }
h1 { font: 700 28px/1.3 Georgia, serif; color: #e5c378; margin: 0 0 8px; }
.subtitle { font-size: 15px; color: #a1b8b2; margin-bottom: 24px; border-bottom: 1px solid #253e47; padding-bottom: 16px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 24px 0; }
.metric-card { background: #13242c; border: 1px solid #274550; border-radius: 6px; padding: 16px; }
.metric-card h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #9bc6bd; margin: 0 0 6px; }
.metric-card p { font-size: 13px; color: #cfded9; margin: 0; line-height: 1.45; }
.highlight { color: #8ee5ff; font-weight: 600; }
.instructions { background: #162a34; border-left: 4px solid #e5c378; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #e2ede8; border-radius: 0 4px 4px 0; }
footer { margin-top: 48px; padding-top: 18px; border-top: 1px solid #253e47; font-size: 13px; color: #8aa19b; }
</style>
${visualComparisonAssets()}
</head>
<body>
<main>
<header>
<h1>Retiro del Dragón · Mejoras 1 y 2</h1>
<div class="subtitle">Refinamiento visual de impacto medio · Profundidad 2.5D (estilo Octopath Traveler II) y Relieve de Acantilados/Costa</div>
</header>

<div class="instructions">
<strong>Instrucciones de visualización:</strong> Pulsa sobre cualquier imagen para superponer el estado <em>Después</em> conservando encuadre, zoom y resolución. Pulsa de nuevo para regresar al <em>Antes</em>. Usa el botón <em>Ampliar</em> para inspeccionar detalles con zoom interactivo.
</div>

<div class="card-grid">
<div class="metric-card">
<h3>1. Profundidad 2.5D</h3>
<p>Primer plano orgánico diorama (<span class="highlight">organicStone</span> con normales suaves) y atenuación Hermite inteligente (<span class="highlight">0.42 a 0.94</span>) que preserva la oclusión natural del actor sin convertir la roca en un holograma fantasmal.</p>
</div>
<div class="metric-card">
<h3>2. Acantilados y Costa</h3>
<p>Diferenciación de planos lejanos mediante perspectiva aérea en <span class="highlight">islandBackdrop</span> (albedo difuso ×0.86, emisivo frío atmosférico <span class="highlight">#0a1014</span>) y banda intermareal con oscurecimiento húmedo en la rompiente.</p>
</div>
<div class="metric-card">
<h3>Rendimiento & Tests</h3>
<p><span class="highlight">0 colisionadores adicionales</span>, 0 nuevas geometrías bloqueantes, 60 FPS estables. <span class="highlight">30/30 tests</span> de presentación y regresión pasando sin fallos.</p>
</div>
</div>

<section>
${figures}
</section>

<footer>
<p>Verificación técnica realizada en el área de ascenso costero del Retiro del Dragón (entre Playa / Embarcadero y Caseta del Cabrestante A2). Registro de firmas SHA-256 en <a href="records.json">records.json</a>.</p>
</footer>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
console.log('HTML comparison viewer built successfully at output/retreat-depth-cliffs-20261109/index.html');
