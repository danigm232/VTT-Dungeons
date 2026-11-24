import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { visualComparison, visualComparisonAssets } from './lib/visual-comparison.mjs';

const outputDir = path.resolve('output/micro-visual-improvements-20261119');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function inspectPng(relPath) {
  const full = path.join(outputDir, relPath);
  const bytes = fs.readFileSync(full);
  return {
    path: relPath.replace(/\\/g, '/'),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

const pairs = [
  {
    id: 'pecio-token-shadows',
    campaign: 'Transversal (Pecio + Retiro + Campamentos)',
    title: '01 · Tokens 2.5D · Sombra de contacto por estatura y atenuación aérea',
    desc: 'Huella radial proporcionada a target_height * current_height_scale (Trinity < Mia < Mike) y desvanecimiento progresivo en salto o vuelo de arpía (alpha 1.0 → 0.38).',
    before: 'before/pecio-token-shadows.png',
    after: 'after/pecio-token-shadows.png',
    camera: 'ortho 1440×810 · pitch 25° · distance 6.8 m · day/clear'
  },
  {
    id: 'pecio-token-stealth-ring',
    campaign: 'Transversal (Pecio + Retiro + Campamentos)',
    title: '02 · Anillo de selección · Pulso orgánico y atenuación real en sigilo',
    desc: 'Oscilación lenta en emission_energy_multiplier (1.25–1.85) y escala (+2.5 %, respetando SkillLoading.reduced), combinada con sigilo translúcido real (albedo_color.a = 0.28 y emission_enabled = false).',
    before: 'before/pecio-token-stealth-ring.png',
    after: 'after/pecio-token-stealth-ring.png',
    camera: 'ortho 1440×810 · pitch 23° · distance 4.8 m · is_stealth=true'
  },
  {
    id: 'pecio-ocean-dusk',
    campaign: 'Pecio Rosa de los Vientos',
    title: '03 · Pecio · Océano Fresnel y horizonte sincronizados con el cielo (Ocaso)',
    desc: 'Inyección dinámica de fresnel_sky_color, distant_color_tint y fresnel_strength desde ship_environment.gd hacia ocean_water.gdshader según hora del día y clima.',
    before: 'before/pecio-ocean-dusk.png',
    after: 'after/pecio-ocean-dusk.png',
    camera: 'ortho 1440×810 · pitch 7.5° · distance 28 m · dusk/clear'
  },
  {
    id: 'pecio-night-horizon',
    campaign: 'Pecio Rosa de los Vientos',
    title: '04 · Pecio · Noche, bloom calibrado y suelo celeste coherente',
    desc: 'glow_intensity = 0.32 y glow_bloom = 0.045 en main.tscn alineados con ship_environment.gd, además de ground_bottom_color nocturno y tintado Fresnel lunar.',
    before: 'before/pecio-night-horizon.png',
    after: 'after/pecio-night-horizon.png',
    camera: 'ortho 1440×810 · pitch 10° · distance 21 m · night/clear + antorcha'
  },
  {
    id: 'camp-forest-ao-normals',
    campaign: 'Campamentos de Descanso',
    title: '05 · Campamentos · Normales orgánicas tileables FBM y contacto AO en bívac',
    desc: 'make_organic_normal() con ruido lattice periódico multioctava y mipmaps caché para lona y cuero (make_leather_mat), más decals AO acolchados con margen nulo bajo asientos, mochilas, sacos y fogón.',
    before: 'before/camp-forest-ao-normals.png',
    after: 'after/camp-forest-ao-normals.png',
    camera: 'ortho 1440×810 · pitch 22° · zoom 7.4 m · camp-forest-pleamar · day/clear'
  },
  {
    id: 'camp-refuge-ao-dusk',
    campaign: 'Campamentos de Descanso',
    title: '06 · Campamentos · Contacto AO bajo luz de hoguera al anochecer',
    desc: 'Integración de mochilas, kits personales, petates y aro de piedras junto a la hoguera en camp-coastal-refuge sin bordes cuadrados ni sobresaturación.',
    before: 'before/camp-refuge-ao-dusk.png',
    after: 'after/camp-refuge-ao-dusk.png',
    camera: 'ortho 1440×810 · pitch 23° · zoom 7.2 m · camp-coastal-refuge · dusk/clear'
  },
  {
    id: 'retiro-dusk-sky',
    campaign: 'El Retiro del Dragón',
    title: '07 · Retiro · Sincronización de ProceduralSkyMaterial y fog_light_color (Ocaso)',
    desc: '_apply_atmosphere_lighting ahora actualiza sky_top_color, sky_horizon_color, ground_horizon_color, ground_bottom_color y env.fog_light_color para day / dusk / night.',
    before: 'before/retiro-dusk-sky.png',
    after: 'after/retiro-dusk-sky.png',
    camera: 'ortho 1440×810 · pitch 5.0° · distance 42 m · orbit -2.0 · dusk cabecera oeste y mar'
  },
  {
    id: 'retiro-a5-ao',
    campaign: 'El Retiro del Dragón',
    title: '08 · Retiro · AO de contacto en columnas y braseros del Templo A5',
    desc: '_build_interior_contact_ao() añade decals suaves reutilizando _get_contact_shadow_material() bajo ParthenonColBaseLow_* y TempleBrazier_* sobre el estilóbato.',
    before: 'before/retiro-a5-ao.png',
    after: 'after/retiro-a5-ao.png',
    camera: 'ortho 1440×810 · pitch 25° · distance 13.5 m · day (cubierta oculta para inspección)'
  },
  {
    id: 'retiro-a3-ao',
    campaign: 'El Retiro del Dragón',
    title: '09 · Retiro · AO de contacto en mobiliario de A3 Refectorio y A4 Biblioteca',
    desc: 'Decals radiales parametrizados por alfa situados a +0.023 m sobre los losados de A3 y A4 bajo mesas corridas, bancos, fogón, isla de cocina, toneles, librerías y pupitres.',
    before: 'before/retiro-a3-ao.png',
    after: 'after/retiro-a3-ao.png',
    camera: 'ortho 1440×810 · pitch 24° · distance 11.2 m · day (techo cutaway abierto)'
  },
  {
    id: 'retiro-signpost-plaque',
    campaign: 'El Retiro del Dragón · VA-16',
    title: '10 · Retiro / Transversal · Balanceo pendular suave en placa dragon_plaque',
    desc: 'Pivote SignpostSwingPivot en dragon_plaque (±0.024 rad en rotación local X sin alterar el Transform global del poste SignpostProp ni incumplir movimiento reducido).',
    before: 'before/retiro-signpost-plaque.png',
    after: 'after/retiro-signpost-plaque.png',
    camera: 'ortho 1440×810 · pitch 12.0° · distance 6.0 m · day en observatory_approach.tscn'
  }
];

const records = pairs.map((p) => {
  const bMeta = inspectPng(p.before);
  const aMeta = inspectPng(p.after);
  return {
    id: p.id,
    campaign: p.campaign,
    title: p.title,
    camera: p.camera,
    before: bMeta,
    after: aMeta,
    sameResolution: bMeta.width === aMeta.width && bMeta.height === aMeta.height
  };
});

fs.writeFileSync(path.join(outputDir, 'records.json'), JSON.stringify(records, null, 2));

const cardsHtml = pairs.map((p, idx) => {
  const rec = records[idx];
  const comp = visualComparison({
    before: p.before,
    after: p.after,
    title: p.title,
    width: rec.before.width,
    height: rec.before.height
  });
  return `
    <article class="card" id="${p.id}">
      <div class="card-head">
        <span class="pill">${p.campaign}</span>
        <h3>${p.title}</h3>
      </div>
      <p class="desc">${p.desc}</p>
      ${comp}
      <p class="meta">Encuadre equivalente: <code>${p.camera}</code> · Resolución: <code>${rec.before.width}×${rec.before.height}</code> · SHA-256 Antes: <code>${rec.before.sha256.slice(0, 12)}…</code> · Después: <code>${rec.after.sha256.slice(0, 12)}…</code></p>
    </article>`;
}).join('\n');

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dungeons 2.5D · Informe de Micromejoras Visuales (Pecio + Retiro + Campamentos)</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0f171c; color: #eae4d6; font: 15px/1.6 system-ui, -apple-system, sans-serif; }
    main { max-width: 1280px; margin: 0 auto; padding: 30px 22px 72px; }
    header { border-bottom: 1px solid #2e454d; padding-bottom: 18px; margin-bottom: 24px; }
    h1, h2, h3 { font-family: Georgia, serif; color: #f0d7a8; margin: 0 0 8px; }
    h1 { font-size: 28px; }
    h2 { font-size: 21px; margin-top: 28px; }
    .pill { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; background: #1d3640; color: #9ad8c6; border: 1px solid #355a66; margin-bottom: 6px; }
    .note { padding: 14px 16px; background: #15252c; border-left: 4px solid #d4af6e; border-radius: 4px; margin: 16px 0 24px; }
    .card { background: #142228; border: 1px solid #2d444c; border-radius: 6px; padding: 20px; margin-bottom: 26px; }
    .desc { color: #b7c9c4; margin: 0 0 14px; font-size: 14px; }
    .meta { margin: 10px 0 0; font-size: 12px; color: #8ea59f; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0 24px; font-size: 13px; }
    th, td { border: 1px solid #2d444c; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #1a2d35; color: #f0d7a8; }
    code { background: #0c1317; padding: 1px 5px; border-radius: 3px; color: #cfe6de; font-size: 12px; }
    .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin: 14px 0 24px; }
    .status-box { background: #142228; border: 1px solid #2d444c; border-radius: 6px; padding: 14px; }
    .status-box h3 { font-size: 15px; margin-bottom: 6px; }
  </style>
</head>
<body>
<main>
  <header>
    <span class="pill">Godot 4.7.2 Forward+ · NVIDIA GeForce MX350</span>
    <h1>Informe Visual · Micromejoras Transversales y por Campaña</h1>
    <p>Comparativa exacta Antes (commit base <code>be54ff9</code>) vs Después sobre idéntica cámara ortogonal 2.5D, resolución 1440×810, iluminación y estado de escena.</p>
  </header>

  <div class="note">
    <strong>Modo de revisión Antes / Después:</strong> Pulsa o toca cualquier imagen para superponer la versión <strong>DESPUÉS</strong> exactamente en el mismo rectángulo; otro clic vuelve al <strong>ANTES</strong>. Usa <strong>Ampliar</strong> para revisar al 100%–300% y teclas <kbd>Espacio</kbd> / <kbd>Enter</kbd> / <kbd>Esc</kbd>.
  </div>

  <h2>1. Registro de cambios de arte, shaders y materiales</h2>
  <table>
    <thead>
      <tr><th>ID</th><th>Archivo propietario</th><th>Valor / recurso anterior</th><th>Derivado / valor candidato</th><th>VA / Referencia</th></tr>
    </thead>
    <tbody>
      <tr><td><code>MM-01</code></td><td><code>prototypes/godot-{pecio,retiro,campamentos}/scripts/player_token.gd</code></td><td><code>ContactShadow</code> escala uniforme fija 1.0 y alfa constante 1.0 (sin compensar altura ni doble reducción en campamentos)</td><td>Escala por estatura (<code>clampf(target_height * current_height_scale / 1.82, 0.62, 1.12)</code> compensando <code>mesh_race</code> en campamentos) y atenuación alfa aérea (<code>lerpf(1.0, 0.38, airborne)</code>)</td><td>VA-04 · Legibilidad de plano / anclaje al suelo</td></tr>
      <tr><td><code>MM-02</code></td><td><code>prototypes/godot-{pecio,retiro,campamentos}/scripts/player_token.gd</code></td><td><code>SelectionRing</code> emisión fija 1.6 sin pulso ni atenuación de emisión en sigilo o asiento</td><td>Pulso lento (<code>1.25–1.85</code> y +2.5 % escala respetando <code>SkillLoading.reduced</code>), anillo oculto sentado/reposando y sigilo translúcido real (<code>albedo_color.a = 0.28</code> y <code>emission_enabled = false</code>) en <code>is_stealth</code></td><td>VA-11 · Claridad táctica HUD / token</td></tr>
      <tr><td><code>MM-03</code></td><td><code>prototypes/godot-retiro/scripts/retreat_layout_builder.gd</code></td><td><code>_apply_atmosphere_lighting()</code> sin actualizar <code>ProceduralSkyMaterial</code> ni <code>env.fog_light_color</code></td><td>Cielo y niebla sincronizados por franja horaria (<code>day</code>, <code>dusk</code>, <code>night</code>) en cielo, horizonte y suelo</td><td>VA-01 · Coherencia atmósfera-terreno (REF-07)</td></tr>
      <tr><td><code>MM-04</code></td><td><code>prototypes/godot-retiro/scripts/retreat_layout_builder.gd</code></td><td>A3, A4, A5 columnas/braseros/muebles sin decals locales de oclusión de contacto</td><td><code>_build_interior_contact_ao()</code> con material radial cacheado por alfa en A5 (<code>ParthenonColBaseLow_*</code>, <code>TempleBrazier_*</code>), A3 (mesas, bancos, fogón, isla, toneles), A4 (librerías, mesa cartográfica, pupitres) y A1 plaza</td><td>VA-03 / VA-07 · Contacto de arquitectura y mobiliario</td></tr>
      <tr><td><code>MM-05</code></td><td><code>prototypes/godot-pecio/shaders/ocean_water.gdshader</code> y <code>ship_environment.gd</code></td><td>Fresnel oceánico y <code>distant_color</code> fijos en gris frío; <code>main.tscn</code> glow inicial <code>0.5 / 0.10</code> y sin <code>ground_bottom_color</code></td><td>Uniforms <code>fresnel_sky_color</code>, <code>distant_color_tint</code>, <code>fresnel_strength</code> sincronizados con cielo/clima, <code>ground_bottom_color</code> ajustado y glow inicial <code>0.32 / 0.045</code></td><td>VA-05 / VA-09 · Reflejo marino y contención de bloom</td></tr>
      <tr><td><code>MM-06</code></td><td><code>prototypes/godot-campamentos/scripts/camp_material_kit.gd</code> y <code>camp_prop_factory.gd</code></td><td>Normales procedimentales senoidales sin mipmaps; cuero reutilizando veta de roble; props de bívac sin decals AO</td><td><code>make_organic_normal()</code> FBM periódico cacheado con mipmaps (<code>cloth</code>, <code>leather</code>, <code>timber</code>, <code>rock</code>), <code>make_leather_mat</code> usando <code>"leather"</code> y <code>_add_prop_contact_ao()</code> con textura radial acolchada a 0 alfa en bordes</td><td>VA-02 / VA-06 · Materialidad orgánica y contacto</td></tr>
      <tr><td><code>MM-07</code></td><td><code>prototypes/godot-{retiro,pecio,campamentos}/scripts/map_exit.gd</code></td><td>Placas colgantes <code>dragon_plaque</code> completamente rígidas</td><td>Pivote superior <code>SignpostSwingPivot</code> en cadenas (<code>±0.024 rad</code>, respetando <code>SkillLoading.reduced</code> y sin alterar <code>SignpostProp</code>)</td><td>VA-16 · Vida ambiental en hitos de salida</td></tr>
    </tbody>
  </table>

  <h2>2. Comparativas visuales Antes / Después</h2>
  ${cardsHtml}

  <h2>3. Separación estricta de verificación y aceptación</h2>
  <div class="status-grid">
    <div class="status-box">
      <h3>Pruebas técnicas automatizadas</h3>
      <p>Ejecutadas tras la última edición: Pecio (<code>test_ship_environment</code> 2210/0, <code>test_character_animations</code> OK, <code>test_vtt_interfaces</code> 57/0, <code>test_camera_contract</code> 49/0; nota: <code>test_pecio_integrity</code> falla 8 capas previas <code>Grid_C1..C10</code> ajenas a estos cambios), Retiro (<code>test_retreat_layout</code> 136/0, <code>test_map_exits</code> 128/0, <code>test_camera_contract</code> 49/0) y Campamentos (<code>test_camps_layout</code> 151/0 con avisos previos de <code>get_visible_rect</code> en headless, <code>test_camera_contract</code> 49/0).</p>
    </div>
    <div class="status-box">
      <h3>Revisión visual integrada</h3>
      <p>Capturas reales Forward+ 1440×810 inspeccionadas directamente en disco sin HUD superpuesto ni reencuadre.</p>
    </div>
    <div class="status-box">
      <h3>Aceptación del usuario</h3>
      <p><strong>Pendiente</strong> de revisión interactiva por el usuario sobre este informe y en escena viva.</p>
    </div>
    <div class="status-box">
      <h3>Pruebas físicas en dispositivo</h3>
      <p><strong>Pendiente</strong> de comprobación manual en portátil GeForce MX350 y proyector/móvil de mesa.</p>
    </div>
  </div>

  <h2>4. Mini/micromejoras visuales adicionales detectadas durante la implementación</h2>
  <ul>
    <li><strong>Carpintería 3D fija en carteles de Pecio y Campamentos:</strong> En <em>El Retiro del Dragón</em> <code>map_exit.gd</code> ya construye postes 3D reales y estáticos con doble cara y montículo de tierra, mientras que en <em>Pecio</em> y <em>Campamentos</em> <code>map_exit.gd</code> sigue rotando por completo <code>SignpostProp.look_at(...)</code> hacia la cámara usando un <code>Sprite3D</code> simple. Portar la carpintería 3D estática eliminaría el billboarding al orbitar.</li>
    <li><strong>Cielo dinámico en rutas secundarias de Retiro:</strong> Las subescenas <code>pleamar_coves.tscn</code>, <code>observatory_approach.tscn</code> y <code>pecio_cove_arrival.tscn</code> usan <code>route_destination_controller.gd</code> con cielo fijo de mediodía y no responden todavía a <code>set_time_of_day()</code> desde el selector de hora.</li>
    <li><strong>Pouch y petate de cuero cerca del fogón en Campamentos:</strong> En <code>camp_prop_factory.gd</code> (<code>create_campfire_hearth_kit</code>, línea 350+) <code>mat_leather</code> seguía llamando a <code>make_cloth_mat(...)</code> en vez de <code>MatKit.make_leather_mat(...)</code>.</li>
  </ul>
</main>
${visualComparisonAssets()}
</body>
</html>`;

fs.writeFileSync(path.join(outputDir, 'index.html'), html);
console.log('REPORT_WRITTEN=' + path.join(outputDir, 'index.html'));
console.log('RECORDS_COUNT=' + records.length);
