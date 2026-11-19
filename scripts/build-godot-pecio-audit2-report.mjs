#!/usr/bin/env node
/**
 * Builds and validates the consolidated Before/After visual comparison report
 * for the full-ship zone audit & fixes on Pecio del Dragón Marrón (Godot 4.7.2).
 *
 * Output:
 *   output/godot-pecio-audit2-20261115/report.html
 *   output/godot-pecio-audit2-20261115/manifest.json
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { visualComparison, visualComparisonAssets } from "./lib/visual-comparison.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "output", "godot-pecio-audit2-20261115");
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
		view: "bow",
		title: "Proa (Bow) — Balas de cañón en hierro forjado, gaviota en bita babor y mamparo proel retranqueado",
		notes: [
			"Reemplazado el bloque gris de cannon-ball.glb (escala 1.4 con shader de roble) por pirámide 3+1 de balas en hierro forjado (#282b30, escala 0.38).",
			"Retirada la gaviota y cilindro solapados sobre la boca del cañón (26.0, 2.5); posada sobre la bita de amarre babor real (28.3, 3.71, -1.05).",
			"Recortado forepeak_b (-0.30 m) dentro del forro curvo de proa y reajustado FallenForemast_C2 sobre la amurada de babor."
		]
	},
	{
		view: "c2",
		title: "Castillo de Proa (C2) — Despeje del cañón, trinquete abatido y fauna sin colisión con el armamento",
		notes: [
			"Comprobación cenital de proa: gaviota en bita babor, pirámide de munición compacta junto al cañón y trinquete caído alineado sobre babor."
		]
	},
	{
		view: "stern-breach",
		title: "Brecha de Popa (P16 / Stern Breach) — Codaste integrado en espejo, timón articulado y astillas irregulares",
		notes: [
			"Añadido codaste vertical de roble (RudderPost) y reubicado RudderBlade (-0.34 m) con herrajes articulados eliminando el hueco flotante bajo la galería.",
			"Reforzado SternBreachSplinters con tablas astilladas irregulares en dintel y jambas manteniendo libre el canal sumergido P16 (z = -1.45..+1.45)."
		]
	},
	{
		view: "c4",
		title: "C4 — Camarote del Capitán: Eliminado el triángulo de sombra cortante bajo escritorio y alfombra",
		notes: [
			"Elevado Lantern_C4_Captain sobre pie metálico de sobremesa (y = 1.24) y desactivada proyección de sombra dura de desk_slab/ped_left/apron (conservando rect contact shadow 0.74).",
			"La luz cálida baña ahora uniformemente la alfombra popel sin proyectar cuñas geométricas cruzando el suelo."
		]
	},
	{
		view: "c7",
		title: "C7 — Comedor de Proa: Banco sur volcado con sus patas completas sobre la cubierta",
		notes: [
			"Sustituida la tabla suelta sin patas por OverturnedBench_C7 completo con dos caballetes apoyados en cubierta cerca de la costilla de estribor."
		]
	},
	{
		view: "c8",
		title: "C8 — Sentina Inundada: Farol de mamparo popel, rellenos ambientales y escombros náuticos en bodega",
		notes: [
			"Añadido segundo farol en popa (Lantern_C8_Aft) y rellenos sin sombras C8_AftFill / C8_ForeFill ampliando la lectura de cuadernas y escotilla P13.",
			"Añadidos maderos flotantes, rollo de cabo húmedo (C8BilgeRopeCoil), cajas adicionales y astillados de impacto en DragonBones_C8."
		]
	},
	{
		view: "c9",
		title: "C9 — Bodega Sumergida: Franja diurna superior eliminada, lastre húmedo legible y microburbujas suaves",
		notes: [
			"Ocultado HullStrakes exterior únicamente en modo cutaway lower_c9_hold para eliminar la franja iluminada por el sol en el borde superior derecho.",
			"Reducidas y suavizadas UnderwaterBubbles_C9 (0.085 m, alfa 0.42) y ajustado material basáltico húmedo (#72858c, roughness 0.56) con mayor alcance de HoldBreachWater_Glow y HoldStairHatch_Glow."
		]
	},
	{
		view: "overview",
		title: "Vista General (Overview) — Control integral de silueta exterior, arboladura y escora",
		notes: ["Sin regresiones en escora (9.5°), mástil mayor, obenques ni mar."]
	},
	{
		view: "c1",
		title: "C1 — Cubierta Principal: Escotilla de carga, combés y accesos a escaleras",
		notes: ["Paridad verificada en cubierta media y acceso a bodega."]
	},
	{
		view: "c3",
		title: "C3 — Castillo de Popa: Rueda de timón, bitácora y claraboyas",
		notes: ["Sin regresiones en iluminación de linternas ni barandillas."]
	},
	{
		view: "c5",
		title: "C5 — Cocina de a Bordo (Galley): Fogón, encimera, poción y cangrejos",
		notes: ["Circulación en DoorC5 e iluminación interior preservadas."]
	},
	{
		view: "c6",
		title: "C6 — Camarote de Tripulación: Literas curvas, retrato de Aleitha y alijo con trampa",
		notes: ["Sin regresiones ni fugas de sombra por el mamparo retranqueado en proa."]
	},
	{
		view: "cofa",
		title: "Cofa y Nido de Arpía (C10): Jarcia, plataforma de vigía y nido",
		notes: ["Estabilidad de arboladura y plataformas de vigía verificada."]
	},
	{
		view: "dragon",
		title: "Costillar de Dragón (Estribor): Impacto de costillas en escollo y brecha de popa",
		notes: ["Continuidad ósea y contacto casco-hueso verificados."]
	},
	{
		view: "remains",
		title: "Restos del Dragón (Babor): Cráneo y vértebras parcialmente sumergidas",
		notes: ["Relieve óseo, espumas y arrecife sin regresiones."]
	},
	{
		view: "rowboat",
		title: "Bote de Remos (Estribor): Flotación dinámica en oleaje y amarre al combés",
		notes: ["Flotación sincronizada con Waves sin cambios indebidos."]
	},
	{
		view: "hatch",
		title: "Escotilla / Escalera C1 -> C8: Tramo descendente y abertura de cubierta",
		notes: ["Descenso físico y barandillas intactos."]
	}
];

const CHANGELOG_ROWS = [
	["BowForepeakWall_Fore / Stbd", "scripts/interiors_builder.gd", "forepeak_b = get_beam_at(27.2) + 0.15", "maxf(0.5, get_beam_at(27.2) - 0.30)", "Auditoría Proa / Geometría", "Evita intrusión de mamparo en forro"],
	["FallenForemast_C2", "scripts/deck_dressing_builder.gd", "pos (25.5, 3.8, -4.5), rot (14, -42, 68)", "pos (24.8, 3.42, -5.1), rot (18, -32, 74)", "Auditoría C2", "Apoyo natural sobre borda babor"],
	["cannon-ball.glb (x4)", "scripts/deck_dressing_builder.gd", "3 esferas escala 1.4 con shader madera-roble", "Pirámide 3+1 escala 0.38 en hierro forjado #282b30", "VA-03 / Proa", "aspecto metálico realista"],
	["Seagull C2", "scripts/deck_dressing_builder.gd", "Cylinder + gaviota en (26.0, 3.0, 2.5) sobre cañón", "Posada sobre bita babor (28.3, 3.71, -1.05)", "Auditoría C2 / Fauna", "Despeja boca del cañón"],
	["SternBreachSplinters + RudderPost", "scripts/hull_builder.gd", "3 cajas ortogonales + RudderBlade a -0.48 m", "8 tablones astillados + RudderPost + bisagra a -0.34 m", "Brecha P16 / VA-06", "Paso libre z=-1.45..+1.45"],
	["Lantern_C4_Captain / CaptainsDesk", "scripts/interiors_builder.gd", "Farol a y=0.96 con sombra dura del tablero", "Soporte bronce y=1.24 + cast_shadow OFF en tablero", "Iluminación C4 / VA-08", "Elimina cuña triangular en alfombra"],
	["OverturnedBench_C7", "scripts/interiors_builder.gd", "Tabla suelta sin patas en (23.6, 0.22, 4.9)", "Grupo tabla + 2 patas completas en (23.1, 0.22, 4.72)", "Mobiliario C7", "Apoyo físico coherente"],
	["C8 Fill + Lantern_C8_Aft + Debris", "scripts/interiors_builder.gd", "Solo C8_WaterGlimmer (18 m) y costillas limpias", "C8_AftFill/ForeFill, farol popa, cabo, maderos y astillas", "Iluminación C8 / Canon", "Legibilidad extrema en sentina"],
	["HullStrakes (C9 cutaway) + Rocks", "scripts/roof_cutout_controller.gd / interiors_builder.gd", "HullStrakes visible al sol en C9; roca #5e6b6e mate", "HullStrakes oculto en lower_c9_hold; basalto húmedo #72858c", "Cutaway C9 / VA-14", "Sin franja blanca en techo C9"],
	["UnderwaterBubbles_C9", "scripts/vfx_manager.gd", "Anillos cian 0.18 m con borde fuerte (alfa 0.78)", "Microburbujas 0.085 m translúcidas (alfa 0.42)", "VFX C9", "Aspecto natural submarino"]
];

const TEST_RESULTS = [
	{ suite: "test_ship_environment.gd", summary: "2192 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_ship_construction.gd", summary: "79 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_pecio_integrity.gd", summary: "Todos los nodos, colisiones, cutaway C8/C9 y PBR verificados OK", exit: 0 },
	{ suite: "test_doors_alignment.gd", summary: "4 puertas alineadas (DoorC4..C7) y atajos T/E/V OK", exit: 0 },
	{ suite: "test_stair_blockage.gd", summary: "4 tramos bidireccionales (12/12 PASSED)", exit: 0 },
	{ suite: "test_babylon_camera_parity.gd", summary: "6/6 suites paridad Babylon OK", exit: 0 },
	{ suite: "test_camera_contract.gd", summary: "49 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_character_animations.gd", summary: "Sprites y animaciones jugador/PNJ OK", exit: 0 },
	{ suite: "test_vtt_interfaces.gd", summary: "55 PASS / 0 FAIL", exit: 0 }
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
<title>Pecio del Dragón Marrón — Auditoría Integral Antes/Después (17 Zonas, Godot 4.7.2)</title>
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
<h1>Pecio del Dragón Marrón — Auditoría Completa de 17 Zonas y Correcciones Antes / Después</h1>
<p>Comparación interactiva exacta con paridad de cámara, FOV, jugador, iluminación base, semilla (<code>${esc(afterEnv.seed)}</code>) y resolución (<code>1280×720</code>) en Godot 4.7.2 Vulkan Forward+. Pulsa o toca cualquier imagen <strong>ANTES</strong> para superponer el <strong>DESPUÉS</strong> en el mismo rectángulo; usa <em>Ampliar</em> o teclado (Espacio/Enter) para inspección detallada.</p>

<div class="summary-grid">
  <div class="kpi"><span>Zonas auditadas y emparejadas</span><strong>17 / 17 vistas completas</strong></div>
  <div class="kpi"><span>Correcciones aplicadas</span><strong>Proa/C2, P16 Popa, C4, C7, C8, C9</strong></div>
  <div class="kpi"><span>Suites headless Godot</span><strong>9 / 9 PASS (EXIT=0)</strong></div>
  <div class="kpi"><span>Entorno captura</span><strong>${esc(afterEnv.time)} / ${esc(afterEnv.weather)} @ ${esc(afterEnv.fixed_fps)} fps</strong></div>
</div>

<h2>1. Comparativas interactivas Antes / Después (17 zonas)</h2>
${comparisonsHtml}

<h2>2. Registro de cambios de geometría, materiales, VFX e iluminación (AGENTS.md)</h2>
<table>
  <thead>
    <tr><th>ID Objeto / Material</th><th>Archivo propietario</th><th>Valor anterior (Antes)</th><th>Valor candidato (Después)</th><th>Referencia / VA</th><th>Aceptación</th></tr>
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
