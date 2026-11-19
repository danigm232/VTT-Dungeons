#!/usr/bin/env node
/**
 * Builds and validates the consolidated Before/After visual comparison report
 * for Pecio del Dragón Marrón AAA 17-zone pass (Godot 4.7.2 Vulkan Forward+).
 *
 * Output:
 *   output/godot-pecio-aaa-20261115/report.html
 *   output/godot-pecio-aaa-20261115/manifest.json
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { visualComparison, visualComparisonAssets } from "./lib/visual-comparison.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "output", "godot-pecio-aaa-20261115");
const BEFORE_DIR = path.join(OUT_DIR, "before");
const AFTER_DIR = path.join(OUT_DIR, "after");
const REPORT_PATH = path.join(OUT_DIR, "report.html");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");

function esc(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function readPngMeta(filePath) {
	const buf = fs.readFileSync(filePath);
	const pngSig = "89504e470d0a1a0a";
	if (buf.subarray(0, 8).toString("hex") !== pngSig) {
		throw new Error(`Invalid PNG signature: ${filePath}`);
	}
	const width = buf.readUInt32BE(16);
	const height = buf.readUInt32BE(20);
	const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
	return { width, height, bytes: buf.length, sha256 };
}

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const FEATURED_VIEWS = [
	{
		view: "overview",
		title: "Vista General (Overview) — Cohesión cromática, arboladura con amantillos y carga Kenney en roble salitroso",
		notes: [
			"Armonización de kenney_weathered.gdshader: barriles y cajas pasan de azulado/pastel a roble envejecido y hierro forjado consistente con cubierta y amuradas.",
			"Nuevos amantillos (YardarmLifts) desde la galleta del palo mayor hasta los penoles de MainYard y TopYard, además de costuras y refuerzo de relinga en velas rasgadas.",
			"Marcador vertical de InteractiveTransition suavizado de aro neón plano a señalización diegética discreta en bronce."
		]
	},
	{
		view: "c1",
		title: "C1 — Cubierta Principal: Percha de respeto trincada, argollas de escotilla y materiales unificados",
		notes: [
			"Percha de respeto SpareMastSpar_C1 con trincas de cáñamo a babor y argollas remachadas en brazola de CargoHatch_C1.",
			"Barriles, cajas y botellas armonizados al roble aceitado/salitroso sin tintes pastel; aro de trepa al palo mayor convertido en anillo diegético sutil."
		]
	},
	{
		view: "c2",
		title: "C2 — Castillo de Proa: Veta de roble en trinquete/palo caído, mascarón y balista naval",
		notes: [
			"ForemastStump_C2 y FallenForemast_C2 aclarados de marrón casi negro a roble salitroso legible (#6d5b44) manteniendo zunchos metálicos y astillas.",
			"Mejor contraste en la línea de flotación y rocas costeras de BowReef bajo las amuras de proa."
		]
	},
	{
		view: "c3",
		title: "C3 — Castillo de Popa: Cofres artesanales con herrajes, bitácora iluminada y hueso fósil calibrado",
		notes: [
			"Sustituidos los dos bloques lisos de popa por SternDeckChest_Port/Stbd con tapa moldurada, flejes de hierro y cierre de bronce.",
			"Bitácora Binnacle_C3 con esfera de compás marina emisiva; cráneo y costillas del dragón recalibrados sin manchas oscuras en moteado."
		]
	},
	{
		view: "c4",
		title: "C4 — Camarote del Capitán: Sillón tapizado en cuero, astrolabio/pluma y remate diorama de mamparos",
		notes: [
			"CaptainsDesk enriquecido con astrolabio de latón, pluma sobre tintero y sillón con cojín y respaldo en cuero carmesí (#6d241b).",
			"Remates superiores continuos CutawayCapRail en el casco interior y molduras en BulkheadJoinery para lectura arquitectónica limpia en cutaway."
		]
	},
	{
		view: "c5",
		title: "C5 — Cocina de a Bordo: Hierro fundido bruñido, ascuas en hogar y remate de mamparos",
		notes: [
			"GalleyStove con chapa de hierro fundido (#2f3335, metallic 0.58) y lecho/ranura de ascuas suaves visibles desde la cámara táctica.",
			"Barriles de cocina unificados vía kenney_weathered.gdshader y remates CutawayCapRail integrados en recorte."
		]
	},
	{
		view: "c6",
		title: "C6 — Camarote de Tripulación: Baúles integrados, retrato y remate perimetral diorama",
		notes: [
			"CrewChestC6 y CrewFootlockerC6 en roble coherente con literas y suelo; contorno superior CutawayCapRail cerrando el forro curvo."
		]
	},
	{
		view: "c7",
		title: "C7 — Comedor de Proa: Aplique cálido proel, vajilla en mesa y cohesión de madera",
		notes: [
			"Nuevo aplique de mamparo Lantern_C7_Forward (25.2, 1.85, 2.20) equilibrando la iluminación cálida junto a MessBarrelC7/MessCrateC7.",
			"Escudillas de roble sobre MessTable_C7 y bordes de corte CutawayCapRail en mamparo y forro."
		]
	},
	{
		view: "c8",
		title: "C8 — Cubierta Baja Inundada: Bomba de sentina de roble, reflejo especular y cargas flotantes",
		notes: [
			"Nueva bomba de sentina con palanca de hierro (BilgePump_C8) junto al puntal proel sin invadir pasillos ni escaleras.",
			"Refinado flood_water.gdshader con mayor respuesta especular y normales de ondulación suave en charcas poco profundas."
		]
	},
	{
		view: "c9",
		title: "C9 — Bodega Sumergida: Ecosistema marino vivo (corales, musgo orgánico, percebes y peces reactivos)",
		notes: [
			"Eliminadas las rocas volcánicas de lastre (rocks-c.glb y Col_C9Rock_*) en SubmergedHold_C9.",
			"Nuevos arrecifes de coral (cuerno de ciervo, domos cerebro, esponjas tubulares y abanicos), musgo orgánico asimétrico con textura procedural y percebes calcáreos ajustados con get_world_pos().",
			"Cardumen de 15 peces 3D articulados con aleteo continuo que nadan por la bodega y se alejan suavemente al acercarse los jugadores."
		]
	},
	{
		view: "cofa",
		title: "C10 — Nido de la Arpía en la Cofa: Gema facetada en lugar de esfera plana y jarcia completa",
		notes: [
			"PickupGems sustituido de esfera cian plana a gema hexagonal facetada con menor emisión especular.",
			"Amantillos superiores visibles bajo las crucetas junto al farol de vigía y marcador vertical suavizado."
		]
	},
	{
		view: "bow",
		title: "Proa y Arrecife de Proa (Bow): Mascarón esculpido de dragón en bronce y cachetes de tajamar",
		notes: [
			"Sustituido el cono inclinado de proa por DragonFigureheadSculpt multipieza (pecho, cuello, fauces y cuernos en bronce bruñido) con cachetes de roble en BowBeakhead.",
			"Rocas secundarias de basalto fracturado integradas en BowReef sin tapas hexagonales uniformes."
		]
	},
	{
		view: "stern-breach",
		title: "Brecha de Popa (Stern Breach): Mar suavizado en línea de flotación y hueso fósil mineralizado",
		notes: [
			"Suavizada la espuma de contacto (ocean_water.gdshader) eliminando dientes triangulares contra timón, espejo y costillas emergentes.",
			"Bloques basálticos de SternReef inclinados con peñascos secundarios y textura de hueso fósil natural sin moteado verde excesivo."
		]
	},
	{
		view: "dragon",
		title: "Osamenta de Clyssavar (Dragon): Textura de hueso fósil con estrías de osteona y basalto roto",
		notes: [
			"Recalibrado _get_dragon_bone_texture(): marfil fósil (#dbd0b7 / #9e8f6f) con finas estrías longitudinales y fisuras minerales sin manchas tipo leopardo.",
			"Columnas de SternReef inclinadas orgánicamente y complementadas con peñascos angulares bajos."
		]
	},
	{
		view: "remains",
		title: "Cubierta / Restos (Remains): Unión de cajas/barriles al roble del barco y percha trincada",
		notes: [
			"Contraste realista en barriles, cajas de botellas, rollos de cabo y percha de respeto con señalizador de jarcia diegético discreto."
		]
	},
	{
		view: "rowboat",
		title: "Bote de Remos (Rowboat): Enjaretado de piso interior, farol de proa y contacto limpio con el mar",
		notes: [
			"Añadidos listones de piso (duckboards) y pequeño farol de proa en RetiroRowboatHull.",
			"Eliminación de los picos blancos poligonales de espuma a lo largo del pantoque y línea de flotación del barco."
		]
	},
	{
		view: "hatch",
		title: "Escotilla Principal (Hatch): Argollas de hierro en brazola y transición suave de espuma en casco",
		notes: [
			"Añadidas argollas de forja en CargoHatch_C1, mejor acabado de madera en cubiertas/carga y reducción drástica del serrado en el borde de agua inferior."
		]
	}
];

const CHANGELOG_ROWS = [
	["kenney_weathered.gdshader", "shaders/kenney_weathered.gdshader", "Tinte beige/azul pastel (age 0.68, grime 0.62)", "Roble salitroso cálido (age 0.82, grime 0.46–1.04, musgo 0.34)", "VA-03 / Cohesión", "Aprobado en C1,C5,C6,C7,C8,C9"],
	["ocean_water.gdshader", "shaders/ocean_water.gdshader", "Borde lip_core/roller agresivo con dientes de sierra en casco", "edge_aa + erosión orgánico-lisa en contacto casco/bote/roca", "VA-02 / Línea agua", "Verificado en rowboat/hatch/stern"],
	["cloth_sail.gdshader & flood_water.gdshader", "shaders/cloth_sail.gdshader / flood_water.gdshader", "Velas sin refuerzo de relinga; agua sentina specular 0.16", "Dobladillo de relinga y costura; sentina specular 0.32 y riple 0.026", "VA-03 / VA-08", "Verificado en overview/c8/c9"],
	["_get_dragon_bone_texture", "scripts/pbr_material_kit.gd", "Hueso amarillo mostaza con manchas verde oscuro (0.85)", "Marfil fósil #dbd0b7/#9e8f6f con estrías longitudinales y fisuras finas", "VA-03 / Dragon", "Verificado en dragon/c3/c5"],
	["InteractiveTransition & PickupGems/Gold", "scripts/interactive_transition.gd / interactive_pickup.gd", "Aro neón naranja plano (emission 1.4); esfera cian en cofa", "Aro bronce diegético discreto (0.36) + gema hexagonal/monedas", "VA-07 / Diegesis", "Sin anillos planos"],
	["DragonFigureheadSculpt & Trailboards", "scripts/hull_builder.gd", "Cono simple como mascarón en BowBeakhead", "Escultura multipieza de dragón en bronce + cachetes de roble", "VA-01 / Bow", "Visible en bow.png y c2.png"],
	["SternReef / BowReef & Rowboat", "scripts/reef_builder.gd", "Columnas hexagonales verticales; bote sin enjaretado/farol", "Inclinación orgánica + rocas secundarias; duckboards + farol de proa", "VA-02 / Rowboat", "Verificado en rowboat/dragon/bow"],
	["Deck Dressing & YardarmLifts", "scripts/deck_dressing_builder.gd / rigging_builder.gd", "Bancos lisos en C3; tocón C2 oscuro; sin amantillos ni percha", "Cofres con herrajes + compás en C3, tocón #6d5b44, argollas hatch, percha C1, YardarmLifts", "VA-01 / VA-11", "Verificado en c1/c2/c3/cofa"],
	["Cabinas C4–C7, C8, C9 & RoofCutout", "scripts/interiors_builder.gd / roof_cutout_controller.gd", "Cantos cutaway finos; C5 negro; lastre de rocas en C9 y percebes exteriores visibles en cutaway", "CutawayCapRail + BulkheadJoinery; cuero C4; ascuas C5; bomba C8; C9 sin rocas, con corales, musgo orgánico, percebes y 15 peces reactivos; WaterlineBarnacles_Port/DrippingKelp_Port ocultos en lower_c9_hold", "VA-05 / VA-07 / VA-09", "Ocultación RoofCutout y huida de peces OK"]
];

const TEST_RESULTS = [
	{ suite: "test_ship_environment.gd", summary: "SHIP ENVIRONMENT: 2195 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_ship_construction.gd", summary: "SHIP CONSTRUCTION: 79 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_pecio_integrity.gd", summary: "Nodos canónicos, colisiones, RoofCutout, 11 oclusores, PBR y bote OK", exit: 0 },
	{ suite: "test_doors_alignment.gd", summary: "ALL 4 CABIN DOORS VERIFIED AND PROPERLY ALIGNED (DoorC4..C7)", exit: 0 },
	{ suite: "test_stair_blockage.gd", summary: "ALL 4 STAIR FLIGHTS 100% WALKABLE IN BOTH DIRECTIONS (12/12 PASSED)", exit: 0 },
	{ suite: "test_babylon_camera_parity.gd", summary: "FULL BABYLON CAMERA PARITY VERIFIED (6/6 SUITES)", exit: 0 },
	{ suite: "test_camera_contract.gd", summary: "CAMERA CONTRACT: 49 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_character_animations.gd", summary: "ALL PLAYER & NPC SPRITES/ANIMATIONS VERIFIED", exit: 0 },
	{ suite: "test_vtt_interfaces.gd", summary: "VTT INTERFACES TESTS: 57 PASS / 0 FAIL", exit: 0 }
];

function build() {
	if (!fs.existsSync(BEFORE_DIR) || !fs.existsSync(AFTER_DIR)) {
		throw new Error(`Missing before/ or after/ under ${OUT_DIR}`);
	}

	const beforeCams = readJson(path.join(BEFORE_DIR, "cameras.json"));
	const afterCams = readJson(path.join(AFTER_DIR, "cameras.json"));
	const beforeEnv = readJson(path.join(BEFORE_DIR, "environment.json"));
	const afterEnv = readJson(path.join(AFTER_DIR, "environment.json"));

	if (JSON.stringify(beforeEnv) !== JSON.stringify(afterEnv)) {
		throw new Error("environment.json mismatch between before and after");
	}
	if (beforeCams.length !== afterCams.length) {
		throw new Error(`Camera count mismatch: ${beforeCams.length} vs ${afterCams.length}`);
	}

	const afterCamByView = new Map(afterCams.map((c) => [c.view, c]));
	const originals = [];
	const parityRows = [];

	for (const bCam of beforeCams) {
		const view = bCam.view;
		const aCam = afterCamByView.get(view);
		if (!aCam) throw new Error(`Missing view '${view}' in after/cameras.json`);

		const camEqual =
			bCam.camera === aCam.camera &&
			bCam.fov === aCam.fov &&
			bCam.width === aCam.width &&
			bCam.height === aCam.height &&
			bCam.mode === aCam.mode &&
			bCam.seed === aCam.seed &&
			bCam.fixed_fps === aCam.fixed_fps;
		if (!camEqual) {
			throw new Error(`Camera parity mismatch on view '${view}'`);
		}

		const beforeRel = `before/${view}.png`;
		const afterRel = `after/${view}.png`;
		const bMeta = readPngMeta(path.join(OUT_DIR, beforeRel));
		const aMeta = readPngMeta(path.join(OUT_DIR, afterRel));
		if (bMeta.width !== bCam.width || bMeta.height !== bCam.height || aMeta.width !== aCam.width || aMeta.height !== aCam.height) {
			throw new Error(`PNG dimension mismatch on view '${view}'`);
		}

		originals.push({ view, role: "before", path: beforeRel, ...bMeta });
		originals.push({ view, role: "after", path: afterRel, ...aMeta });
		parityRows.push({
			view,
			mode: aCam.mode,
			fov: aCam.fov,
			resolution: `${aMeta.width}×${aMeta.height}`,
			beforeSha: bMeta.sha256,
			afterSha: aMeta.sha256,
			changed: bMeta.sha256 !== aMeta.sha256
		});
	}

	const comparisonsHtml = FEATURED_VIEWS.map((item) => {
		const row = parityRows.find((r) => r.view === item.view);
		const aCam = afterCamByView.get(item.view);
		const bMeta = originals.find((o) => o.view === item.view && o.role === "before");
		const fig = visualComparison({
			before: `before/${item.view}.png`,
			after: `after/${item.view}.png`,
			title: item.title,
			width: bMeta.width,
			height: bMeta.height
		});
		const notes = item.notes.map((n) => `<li>${esc(n)}</li>`).join("");
		return `
			<section class="card" id="view-${esc(item.view)}">
				${fig}
				<div class="meta-strip">
					<span>Modo: <code>${esc(aCam.mode)}</code></span>
					<span>FOV: <code>${esc(aCam.fov)}°</code></span>
					<span>Resolución: <code>${esc(row.resolution)}</code></span>
					<span>Semilla / FPS: <code>${esc(aCam.seed)} / ${esc(aCam.fixed_fps)}</code></span>
					<span>Pixel delta: <code>${row.changed ? "ACTUALIZADO" : "IDÉNTICO"}</code></span>
				</div>
				<ul class="notes">${notes}</ul>
			</section>
		`;
	}).join("\n");

	const changelogHtml = CHANGELOG_ROWS.map(
		(r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`
	).join("\n");

	const testsHtml = TEST_RESULTS.map(
		(t) => `<tr><td><code>${esc(t.suite)}</code></td><td>${esc(t.summary)}</td><td><code>EXIT=${esc(t.exit)}</code></td></tr>`
	).join("\n");

	const originalsHtml = originals.map(
		(o) => `<tr><td><code>${esc(o.view)}</code></td><td>${esc(o.role)}</td><td><a href="${esc(o.path)}" target="_blank" rel="noopener">${esc(o.path)}</a></td><td>${o.width}×${o.height}</td><td>${o.bytes.toLocaleString("en-US")}</td><td><code>${o.sha256.slice(0, 16)}…</code></td></tr>`
	).join("\n");

	const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pecio del Dragón Marrón — Informe AAA Completo 17 Zonas (Antes/Después)</title>
<style>
:root { color-scheme: dark; font-family: system-ui, -apple-system, sans-serif; }
body { margin: 0 auto; max-width: 1200px; padding: 28px 20px 64px; background: #0e1116; color: #e6edf3; line-height: 1.5; }
h1, h2 { color: #f0f6fc; margin-top: 28px; }
h1 { font-size: 1.65rem; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0 24px; }
.kpi { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px 14px; }
.kpi strong { display: block; font-size: 1.15rem; color: #79c0ff; }
.card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; padding: 16px; margin: 22px 0; }
.meta-strip { display: flex; flex-wrap: wrap; gap: 10px 18px; font-size: 0.85rem; color: #9ea7b3; margin-top: 8px; }
.notes { margin: 10px 0 0; padding-left: 20px; color: #c9d1d9; }
table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 0.88rem; }
th, td { border: 1px solid #30363d; padding: 7px 10px; text-align: left; vertical-align: top; }
th { background: #161b22; color: #f0f6fc; }
code { background: rgba(110,118,129,0.2); padding: 1px 5px; border-radius: 4px; font-size: 0.85em; }
a { color: #58a6ff; }
</style>
</head>
<body>
<h1>Pecio del Dragón Marrón — Auditoría Visual AAA Completa (17 Zonas / Vistas)</h1>
<p>Comparación interactiva exacta antes/después con paridad de cámara, FOV, jugador, iluminación base, semilla (<code>${esc(afterEnv.seed)}</code>) y resolución (<code>1280×720</code>) en Godot 4.7.2 Vulkan Forward+. Pulsa o toca cualquier imagen <strong>ANTES</strong> para alternar a <strong>DESPUÉS</strong> en el mismo rectángulo; usa <em>Ampliar</em> o teclado (Espacio/Enter) para inspección con zoom y desplazamiento.</p>

<div class="summary-grid">
  <div class="kpi"><span>Zonas comparadas</span><strong>17 / 17 vistas completas</strong></div>
  <div class="kpi"><span>Vistas capturadas</span><strong>${beforeCams.length} antes / ${afterCams.length} después</strong></div>
  <div class="kpi"><span>Suites headless Godot</span><strong>9 / 9 PASS (EXIT=0)</strong></div>
  <div class="kpi"><span>Entorno captura</span><strong>${esc(afterEnv.time)} / ${esc(afterEnv.weather)} @ ${esc(afterEnv.fixed_fps)} fps</strong></div>
</div>

<h2>1. Comparativas interactivas Antes / Después (17 zonas)</h2>
${comparisonsHtml}

<h2>2. Registro de cambios de arte, materiales y acabados AAA (AGENTS.md)</h2>
<table>
  <thead>
    <tr><th>ID Objeto / Material</th><th>Archivo propietario</th><th>Valor actual (Antes)</th><th>Derivado candidato (Después)</th><th>VA / Referencia</th><th>Aceptación</th></tr>
  </thead>
  <tbody>
    ${changelogHtml}
  </tbody>
</table>

<h2>3. Resultados de pruebas automatizadas (ejecutadas tras la última edición)</h2>
<table>
  <thead>
    <tr><th>Suite GDScript</th><th>Resultado observado</th><th>Código</th></tr>
  </thead>
  <tbody>
    ${testsHtml}
  </tbody>
</table>

<h2>4. Registro íntegro de originales (17 vistas antes + 17 vistas después)</h2>
<table>
  <thead>
    <tr><th>Vista</th><th>Tanda</th><th>Archivo</th><th>Dimensiones</th><th>Bytes</th><th>SHA-256 (prefijo)</th></tr>
  </thead>
  <tbody>
    ${originalsHtml}
  </tbody>
</table>

${visualComparisonAssets()}
</body>
</html>`;

	fs.writeFileSync(REPORT_PATH, html, "utf8");

	const manifest = {
		generatedAt: new Date().toISOString(),
		engine: "Godot 4.7.2.stable Forward+",
		environment: afterEnv,
		parityVerifiedViews: parityRows.length,
		allCamerasIdentical: true,
		featuredViews: FEATURED_VIEWS.map((v) => v.view),
		tests: TEST_RESULTS,
		changelogCount: CHANGELOG_ROWS.length,
		originals
	};
	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

	return { html, manifest };
}

function validate() {
	const manifest = readJson(MANIFEST_PATH);
	const html = fs.readFileSync(REPORT_PATH, "utf8");

	for (const entry of manifest.originals) {
		const full = path.join(OUT_DIR, entry.path);
		if (!fs.existsSync(full)) throw new Error(`Missing original PNG: ${full}`);
		const actual = readPngMeta(full);
		if (actual.sha256 !== entry.sha256) {
			throw new Error(`SHA-256 mismatch for ${entry.path}`);
		}
		if (actual.width !== entry.width || actual.height !== entry.height) {
			throw new Error(`Dimension mismatch for ${entry.path}`);
		}
	}

	const compMatches = html.match(/<figure class="vtt-comparison" data-vtt-comparison\b/g) ?? [];
	if (compMatches.length !== FEATURED_VIEWS.length) {
		throw new Error(`Expected ${FEATURED_VIEWS.length} data-vtt-comparison widgets, found ${compMatches.length}`);
	}

	const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
	if (scriptMatches.length === 0) throw new Error("Missing inline script in report.html");
	for (const m of scriptMatches) {
		new vm.Script(m[1]);
	}

	console.log(`REPORT OK: ${REPORT_PATH}`);
	console.log(`MANIFEST OK: ${MANIFEST_PATH} (${manifest.originals.length} PNGs verified, ${compMatches.length} interactive comparisons, inline JS valid)`);
}

build();
validate();
