#!/usr/bin/env node
/**
 * Reproducible asset and layout bundler for prototypes/godot-campamentos.
 * Evaluates TypeScript sources in campaigns/camp-rests/public and engine/shared
 * via Node's native TypeScript execution / tsx loader, writes canonical
 * assets/data/camps-layout.json, and stages camp textures, seated tokens,
 * Quaternius fauna GLBs, shared VTT tokens, combat/inventory/loading modules,
 * and audio files into prototypes/godot-campamentos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'prototypes', 'godot-campamentos');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileSafe(src, dst) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing source file: ${src}`);
  }
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDirRecursive(srcDir, dstDir, options = {}) {
  if (!fs.existsSync(srcDir)) return 0;
  const skipExts = new Set(options.skipExts ?? ['.import']);
  ensureDir(dstDir);
  let count = 0;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === '.godot' || entry.name === 'node_modules') continue;
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      count += copyDirRecursive(src, dst, options);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (skipExts.has(ext)) continue;
      fs.copyFileSync(src, dst);
      count += 1;
    }
  }
  return count;
}

async function importTs(relPath) {
  const full = path.join(ROOT, relPath);
  return import(pathToFileURL(full).href);
}

async function main() {
  const packMod = await importTs('campaigns/camp-rests/public/pack.ts');
  const a1Mod = await importTs('campaigns/camp-rests/public/a1-layout.ts');
  const streamMod = await importTs('campaigns/camp-rests/public/forest-stream.ts');
  const actMod = await importTs('engine/shared/camp-activities.ts');

  const campaign = packMod.campRestsPublicCampaign;
  if (!campaign || !Array.isArray(campaign.scenes)) {
    throw new Error('Failed to load campRestsPublicCampaign.scenes');
  }

  const streamSamples = [];
  for (let row = 0; row <= 22; row++) {
    const z = row * 1.5;
    streamSamples.push({ row, z, x: Number(streamMod.forestStreamX(z).toFixed(4)) });
  }

  const a1RoomsExport = a1Mod.A1_ROOMS.map((r) => {
    const cols = r.cells.map((c) => c.col);
    const rows = r.cells.map((c) => c.row);
    return {
      id: r.id,
      key: `cell-${r.id}`,
      role: r.role,
      occupant: r.role,
      label: r.label,
      colMin: Math.min(...cols),
      colMax: Math.max(...cols),
      rowMin: Math.min(...rows),
      rowMax: Math.max(...rows),
      cells: r.cells,
      entry: r.entry,
      doorCol: r.entry.col,
      interaction: r.interaction,
      objectCell: r.objectCell,
      furniture: r.furniture,
      hasRoof: true,
    };
  });

  const payload = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    defaultSceneId: 'camp-forest-pleamar',
    tileMeters: 1.5,
    activities: actMod.CAMP_ACTIVITIES ?? [],
    forestStream: {
      col: streamMod.FOREST_STREAM_COL,
      baseX: streamMod.FOREST_STREAM_BASE_X,
      samples: streamSamples,
    },
    a1Layout: {
      cols: a1Mod.A1_COLS,
      rows: a1Mod.A1_ROWS,
      plazaCells: a1Mod.A1_PLAZA_CELLS,
      statueCell: a1Mod.A1_STATUE_CELL,
      fireCell: a1Mod.A1_FIRE_CELL,
      spawns: a1Mod.A1_SPAWNS,
      rooms: a1RoomsExport,
    },
    scenes: campaign.scenes.map((s) => {
      const surfTiles = s.terrain?.surfaces?.[0]?.tiles ?? [];
      const campMeta = s.camp ?? {};
      const pts = campMeta.interactionPoints ?? [];
      return {
        id: s.id,
        title: s.title,
        profile: campMeta.visualProfile ?? '',
        canonStatus: campMeta.canonStatus ?? 'vtt-ambience',
        safetyNotice: campMeta.safetyNotice ?? '',
        cols: s.grid.cols,
        rows: s.grid.rows,
        tileMeters: s.terrain?.tileMeters ?? 1.5,
        walkable: surfTiles.map((t) => ({
          col: t.cell.col,
          row: t.cell.row,
          materialId: t.materialId ?? 'stone',
          medium: t.medium ?? 'solid',
        })),
        obstacles: (s.terrain?.obstacles ?? []).map((o) => ({
          col: o.cell.col,
          row: o.cell.row,
          id: o.obstacleId ?? 'obstacle',
        })),
        blockedEdges: (s.terrain?.blockedEdges ?? []).map((e) => ({
          fromCol: e.from.col,
          fromRow: e.from.row,
          toCol: e.to.col,
          toRow: e.to.row,
        })),
        spawns: s.spawns ?? [],
        lights: s.terrain?.lights ?? [],
        seats: s.seats ?? [],
        interactionPoints: pts.map((p) => ({
          id: p.id,
          label: p.label,
          kind: p.kind,
          col: p.cell.col,
          row: p.cell.row,
          objectCol: p.objectCell?.col ?? p.cell.col,
          objectRow: p.objectCell?.row ?? p.cell.row,
          description: p.description ?? '',
          ownerCharacterId: p.ownerCharacterId ?? '',
        })),
        ambience: s.terrain?.ambience ?? [],
        darkness: s.visibility?.darkness ?? 0.55,
        audioProfile: campaign.audio?.sceneProfiles?.[s.id] ?? {},
      };
    }),
    tokens: campaign.tokens ?? [],
  };

  ensureDir(OUT_ROOT);
  const dataOut = path.join(OUT_ROOT, 'assets', 'data', 'camps-layout.json');
  ensureDir(path.dirname(dataOut));
  fs.writeFileSync(dataOut, JSON.stringify(payload, null, 2), 'utf8');

  let copied = 0;

  // 1. Copy camp textures from campaigns/camp-rests/public/art
  const texDst = path.join(OUT_ROOT, 'assets', 'textures');
  copied += copyDirRecursive(path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'a1-hd2d-v1'), texDst, { skipExts: ['.md', '.import'] });
  copied += copyDirRecursive(path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'camp-detail-v1'), texDst, { skipExts: ['.md', '.import'] });
  copied += copyDirRecursive(path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'forest-hd2d-v1'), texDst, { skipExts: ['.md', '.import'] });

  // Copy shared normal maps and stone textures from godot-retiro if missing
  for (const name of ['metal-normal-v1.png', 'rock-normal-v1.png', 'wood-normal-v1.png', 'basalt-coastal-albedo-v1.webp']) {
    const src = path.join(ROOT, 'prototypes', 'godot-retiro', 'assets', 'textures', name);
    const dst = path.join(texDst, name);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      copyFileSafe(src, dst);
      copied += 1;
    }
  }

  // 2. Seated token portraits
  const seatedSrc = path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'camp-seated-v1');
  const seatedDst = path.join(OUT_ROOT, 'assets', 'tokens', 'seated');
  for (const png of ['cleric-seated.png', 'rogue-seated.png', 'wizard-seated.png']) {
    copyFileSafe(path.join(seatedSrc, png), path.join(seatedDst, png));
    copied += 1;
  }

  // 3. Quaternius CC0 forest fauna GLBs
  const faunaSrc = path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'art', 'forest-fauna-v1');
  const faunaDst = path.join(OUT_ROOT, 'assets', 'fauna');
  for (const glb of ['quaternius_cc0-deer-908.glb', 'quaternius_cc0-stag-1373.glb']) {
    copyFileSafe(path.join(faunaSrc, glb), path.join(faunaDst, glb));
    copied += 1;
  }

  // 4. Shared character tokens & animations from godot-retiro
  copied += copyDirRecursive(
    path.join(ROOT, 'prototypes', 'godot-retiro', 'assets', 'tokens'),
    path.join(OUT_ROOT, 'assets', 'tokens'),
  );

  // 5. Camp audio assets
  const audioDst = path.join(OUT_ROOT, 'assets', 'audio');
  copied += copyDirRecursive(path.join(ROOT, 'campaigns', 'camp-rests', 'public', 'audio', 'camp-final-v1'), audioDst, { skipExts: ['.md', '.import'] });
  const stormAudioDir = path.join(ROOT, 'campaigns', 'stormwreck-isle', 'public', 'audio', 'stormwreck', 'ambience');
  const wantedAmbience = [
    'stormwreck-loop-sanctuary.mp3',
    'stormwreck-loop-forest.mp3',
    'stormwreck-loop-forest-night.mp3',
    'stormwreck-loop-forest-fire.mp3',
    'stormwreck-loop-forest-river-01.mp3',
    'stormwreck-loop-boat-waves.mp3',
    'stormwreck-loop-cliff-wind.ogg',
    'stormwreck-loop-rain.mp3',
    'stormwreck-loop-storm.ogg',
    'stormwreck-loop-thunder.ogg',
  ];
  for (const f of wantedAmbience) {
    const src = path.join(stormAudioDir, f);
    if (fs.existsSync(src)) {
      copyFileSafe(src, path.join(audioDst, 'ambience', f));
      copied += 1;
    }
  }
  const sfxSrcDir = path.join(ROOT, 'prototypes', 'godot-pecio', 'assets', 'audio');
  if (fs.existsSync(sfxSrcDir)) {
    copied += copyDirRecursive(sfxSrcDir, path.join(audioDst, 'sfx'), { skipExts: ['.import'] });
  }

  // 6. Copy combat, inventory, loading, and Retiro A1 modules/assets from godot-retiro
  copied += copyDirRecursive(path.join(ROOT, 'prototypes', 'godot-retiro', 'combat'), path.join(OUT_ROOT, 'combat'));
  copied += copyDirRecursive(path.join(ROOT, 'prototypes', 'godot-retiro', 'inventory'), path.join(OUT_ROOT, 'inventory'));
  copied += copyDirRecursive(path.join(ROOT, 'prototypes', 'godot-retiro', 'loading'), path.join(OUT_ROOT, 'loading'));
  copied += copyDirRecursive(path.join(ROOT, 'prototypes', 'godot-retiro', 'assets', 'retreat-modules'), path.join(OUT_ROOT, 'assets', 'retreat-modules'), { skipExts: ['.import'] });
  for (const dataJson of ['retreat-terrain-v2.json', 'global-layout.json']) {
    copyFileSafe(
      path.join(ROOT, 'prototypes', 'godot-retiro', 'assets', 'data', dataJson),
      path.join(OUT_ROOT, 'assets', 'data', dataJson)
    );
    copied += 1;
  }

  // Adjust loading port & default boot target for godot-campamentos
  const coordPath = path.join(OUT_ROOT, 'loading', 'loading_coordinator.gd');
  if (fs.existsSync(coordPath)) {
    let txt = fs.readFileSync(coordPath, 'utf8');
    txt = txt.replace(
      'var port = 47920 if ProjectSettings.get_setting("application/config/name", "").contains("Pecio") else 47921',
      'var app_name := str(ProjectSettings.get_setting("application/config/name", ""))\n\tvar port = 47922 if app_name.contains("Campamentos") else (47920 if app_name.contains("Pecio") else 47921)'
    );
    fs.writeFileSync(coordPath, txt, 'utf8');
  }

  // 7. Copy reusable base VTT scripts and Retiro A1 builder modules from godot-retiro
  const sharedScripts = [
    'vtt_ui_theme.gd',
    'vtt_camera_base.gd',
    'vtt_map_interaction.gd',
    'vtt_projector_hud.gd',
    'character_sprite_catalog.gd',
    'map_exit.gd',
    'map_transition_manager.gd',
    'retreat_structure.gd',
    'retreat_scene_enhancer.gd',
    'object_occlusion_controller.gd',
    'retreat_layout_builder.gd',
  ];
  for (const sc of sharedScripts) {
    const src = path.join(ROOT, 'prototypes', 'godot-retiro', 'scripts', sc);
    const dst = path.join(OUT_ROOT, 'scripts', sc);
    copyFileSafe(src, dst);
    copied += 1;
  }

  console.log(`Exported ${payload.scenes.length} camp scenes -> ${path.relative(ROOT, dataOut)}`);
  for (const sc of payload.scenes) {
    console.log(`  - ${sc.id} (${sc.title}): ${sc.cols}x${sc.rows}, ${(sc.walkable ?? []).length} walkable, ${(sc.obstacles ?? []).length} obstacles, ${(sc.interactionPoints ?? []).length} points`);
  }
  console.log(`Staged ${copied} assets/module files into ${path.relative(ROOT, OUT_ROOT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
