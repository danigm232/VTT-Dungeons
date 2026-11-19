#!/usr/bin/env node
/**
 * Builds and validates the consolidated Before/After visual comparison report
 * for Pecio del Dragón Marrón Cofa (C10) nest/rigging overhaul and exterior
 * boarding rope ladder (SideBoardingLadder) fix.
 *
 * Output:
 *   output/godot-pecio-cofa-stairs-20261115/report.html
 *   output/godot-pecio-cofa-stairs-20261115/manifest.json
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { visualComparison, visualComparisonAssets } from "./lib/visual-comparison.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "output", "godot-pecio-cofa-stairs-20261115");
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
		view: "cofa",
		title: "Cofa (C10) — Rediseño estructural calado, nido orgánico de arpía, iluminación y despeje del mástil",
		notes: [
			"Reemplazado el tambor macizo oscuro de 0.95 m por brazola calada con banderolas metálicas, 16 barrotines (`CrowsNestBulwark`), hueco abierto P10, obenquillos (`CrowsNestFuttockShrouds`), crucetas y tablazón UV.",
			"Nuevo nido de arpía (`Zone_C10_CrowsNest`) con cuenco radial cóncavo (`NestFibreBowl`), 38 ramas de madera a la deriva entrelazadas (`NestWovenTwigs`/`NestDarkBranches`), gavillas de paja, jirones de vela, 2 cráneos humanos, huesos largos (`NestBones`), 16 plumas y aduja de driza.",
			"Añadido farol colgante de vigía (`Cofa_LookoutLanternLight`) y relleno celeste (`Cofa_SkyFill`), y reubicados `HarpyToken` (-0.85, 15.12, -1.05), `PickupGemsCofa` (1.35, 15.32, -1.35) y `CofaExit`/`LadderCofa` (1.45, 15.12, 0.55) sin solaparse dentro de `MainMastSpar`."
		]
	},
	{
		view: "rowboat",
		title: "Exterior / Bote (P01) — Sustitución de la escalera rígida sumergida por escala de gato marinera",
		notes: [
			"Reemplazada la escalera de madera maciza diagonal (`x = 2.45..5.65`, sumergida hasta `y = -2.86 m` en el mar junto al bote y la escotilla C8) por una escala de gato colgante con chicotes de cáñamo trenzado y 5 peldaños cilíndricos (`SideBoardingLadder_Rungs`, `x = 2.60..3.40`, `y = -0.08..-1.36 m`) pegada al forro de estribor.",
			"Mantiene el colisionador `SideBoardingLadder_Ramp` y la coherencia con la amarra del bote auxiliar."
		]
	},
	{
		view: "hatch",
		title: "Escotilla Central (C8) — Verificación exterior/interior sin escaleras sobresalientes al mar",
		notes: [
			"La escalera interior `Stairs_C1_C8` (`z = 5.25`) queda íntegramente dentro del pozo de escotilla central; desde el costado de estribor ya solo asoma la escala de gato marinera pegada al casco."
		]
	},
	{
		view: "overview",
		title: "Regresión Vista General — Silueta del galeón, arboladura e iluminación intactas",
		notes: [
			"Comprobación de encuadre completo tras las mejoras de la cofa C10 y la escala lateral P01."
		]
	},
	{
		view: "c1",
		title: "Regresión C1 — Cubierta principal: navegación, grid e iluminación de cubierta",
		notes: [
			"Verifica que `C1`, las escaleras hacia `C2`/`C3` y el acceso a la escotilla `C8` conservan iluminación y transitabilidad intactas."
		]
	}
];

const CHANGELOG_ROWS = [
	["SideBoardingLadder_Mesh / Rungs", "scripts/hull_builder.gd", "9 peldaños rígidos + zancas sumergidas (`x=2.45..5.65`, `y=-2.86 m`)", "Escala de gato de cáñamo con 5 peldaños de roble y nudos (`x=2.60..3.40`, `y=-0.08..-1.36 m`)", "P01 Rigging / Canon exterior", "Verificada en rowboat/hatch y test_pecio_integrity"],
	["CrowsNestFloor / CrowsNestBulwark", "scripts/rigging_builder.gd", "Tambor opaco 0.95 m + piso oscuro plano", "Brazola baja 0.34 m + zuncho de hierro + 16 barrotines calados + suelo UV `#9b8667`", "VA-03 / VA-07 / C10", "Visible en cofa.png"],
	["CrowsNestFuttockShrouds / MastHoops", "scripts/rigging_builder.gd", "Sin crucetas ni obenquillos inferiores", "8 obenquillos (`fut_shrouds`), crucetas y zunchos de hierro (`mat_cofa_iron`)", "Rigging C10", "Verificado en integrity"],
	["Cofa_LookoutLanternLight / Cofa_SkyFill", "scripts/rigging_builder.gd", "Solo luz global distante", "Farol colgante de vigía + relleno celeste suave en C10", "VA-07 / Iluminación", "Legibilidad de nido y tokens"],
	["Zone_C10_CrowsNest (NestFibreBowl / Twigs / Bones / Feathers)", "scripts/deck_dressing_builder.gd", "Disco marrón plano + toros amarillos + quads básicos", "Cuenco radial cóncavo, 38 ramas a la deriva, paja, jirones de vela, 2 cráneos, 9 huesos, 16 plumas y aduja", "Canon C10 / VA-06 / VA-12", "Verificado en integrity y cofa.png"],
	["HarpyToken / PickupGemsCofa / LadderCofa / CofaExit", "scenes/main.tscn", "Solapados dentro de `MainMastSpar` (`0.35, 15.2, -0.48`)", "Harpy `(-0.85, 15.12, -1.05)`, Gemas `(1.35, 15.32, -1.35)`, CofaExit `(1.45, 15.12, 0.55)`", "Jugabilidad C10", "Dist >= 0.70 m verificada en integrity"]
];

const TEST_RESULTS = [
	{ suite: "test_ship_environment.gd", summary: "2191 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_ship_construction.gd", summary: "79 PASS / 0 FAIL", exit: 0 },
	{ suite: "test_pecio_integrity.gd", summary: "Cofa, nido, escala de gato P01 (`min_y >= -1.85`), despeje Harpy/Mástil (`>= 0.70 m`) y regresión OK", exit: 0 },
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
<title>Pecio del Dragón Marrón — Informe Antes/Después Cofa C10 y Escala Lateral (Godot 4.7.2)</title>
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
<h1>Pecio del Dragón Marrón — Cofa (C10) y Escala Exterior de Abordaje (P01)</h1>
<p>Comparación interactiva exacta con paridad de cámara, FOV, jugador, iluminación base, semilla (<code>${esc(afterEnv.seed)}</code>) y resolución (<code>1280×720</code>) en Godot 4.7.2 Vulkan Forward+. Pulsa o toca cualquier imagen <strong>ANTES</strong> para alternar a <strong>DESPUÉS</strong> en el mismo encuadre; usa <em>Ampliar</em> o teclado (Espacio/Enter) para inspección detallada.</p>

<div class="summary-grid">
  <div class="kpi"><span>Áreas intervenidas</span><strong>Cofa (C10) + Escala P01 / C8</strong></div>
  <div class="kpi"><span>Vistas capturadas</span><strong>${beforeCams.length} antes / ${afterCams.length} después</strong></div>
  <div class="kpi"><span>Suites headless Godot</span><strong>9 / 9 PASS (EXIT=0)</strong></div>
  <div class="kpi"><span>Entorno captura</span><strong>${esc(afterEnv.time)} / ${esc(afterEnv.weather)} @ ${esc(afterEnv.fixed_fps)} fps</strong></div>
</div>

<h2>1. Comparativas interactivas Antes / Después</h2>
${comparisonsHtml}

<h2>2. Registro de cambios de arte, materiales y geometría (AGENTS.md)</h2>
<table>
  <thead>
    <tr><th>ID Objeto / Material</th><th>Archivo propietario</th><th>Recurso / valor actual (Antes)</th><th>Derivado / valor candidato (Después)</th><th>VA / Referencia</th><th>Aceptación</th></tr>
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
