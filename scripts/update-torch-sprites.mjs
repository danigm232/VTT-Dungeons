import fs from 'node:fs';

// 1. Update facing-sprites.ts
let fsprites = fs.readFileSync('campaigns/stormwreck-isle/public/facing-sprites.ts', 'utf8');
fsprites = fsprites.replace(
  "[`direction-${direction}`, existing[`direction-${direction}`] ?? (direction === 's' ? existing.moving : undefined) ?? clip]",
  `[\`direction-\${direction}\`, existing[\`direction-\${direction}\`] ?? (direction === 's' ? existing.moving : undefined) ?? clip],
      [\`torch-walk-\${direction}\`, clip],
      [\`torch-run-\${direction}\`, { ...clip, fps: 2 }],
      [\`torch-idle-\${direction}\`, clip],
      ['torch-draw', clip], ['extraer-antorcha', clip],
      ['torch-stow', clip], ['guardar-antorcha', clip],
      ['use-torch', clip]`
);
fs.writeFileSync('campaigns/stormwreck-isle/public/facing-sprites.ts', fsprites, 'utf8');
console.log('Updated facing-sprites.ts');

// 2. Update pack.ts
let pack = fs.readFileSync('campaigns/stormwreck-isle/public/pack.ts', 'utf8');
const torchCode = `
const mariaTorchDirections = {
  'torch-walk-n': artAtlasCycle('maria_walk_sw_n_sheet.png', 1, 8),
  'torch-walk-ne': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 8, true),
  'torch-walk-e': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 8, true),
  'torch-walk-se': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 8, true),
  'torch-walk-s': artCycle('trinity', 'maria_caminar', 4, 8),
  'torch-walk-sw': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 8),
  'torch-walk-w': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 8),
  'torch-walk-nw': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 8),

  'torch-run-n': artAtlasCycle('maria_run_sw_n_sheet.png', 1, 10),
  'torch-run-ne': artAtlasCycle('maria_run_w_nw_sheet.png', 1, 10, true),
  'torch-run-e': artAtlasCycle('maria_run_w_nw_sheet.png', 0, 10, true),
  'torch-run-se': artAtlasCycle('maria_run_sw_n_sheet.png', 0, 10, true),
  'torch-run-s': artCycle('trinity', 'maria_correr', 4, 10),
  'torch-run-sw': artAtlasCycle('maria_run_sw_n_sheet.png', 0, 10),
  'torch-run-w': artAtlasCycle('maria_run_w_nw_sheet.png', 0, 10),
  'torch-run-nw': artAtlasCycle('maria_run_w_nw_sheet.png', 1, 10),

  'torch-idle-n': artAtlasCycle('maria_walk_sw_n_sheet.png', 1, 1),
  'torch-idle-ne': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 1, true),
  'torch-idle-e': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 1, true),
  'torch-idle-se': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 1, true),
  'torch-idle-s': artCycle('trinity', 'maria_idle', 4, 4),
  'torch-idle-sw': artAtlasCycle('maria_walk_sw_n_sheet.png', 0, 1),
  'torch-idle-w': artAtlasCycle('maria_walk_w_nw_sheet.png', 0, 1),
  'torch-idle-nw': artAtlasCycle('maria_walk_w_nw_sheet.png', 1, 1),

  'torch-draw': artCycle('trinity', 'maria_interactuar', 4, 8),
  'extraer-antorcha': artCycle('trinity', 'maria_interactuar', 4, 8),
  'torch-stow': artCycle('trinity', 'maria_sigilo', 4, 8),
  'guardar-antorcha': artCycle('trinity', 'maria_sigilo', 4, 8),
  'use-torch': artCycle('trinity', 'maria_interactuar', 4, 8)
};
`;

pack = pack.replace(
  'const grid = { cols: 32, rows: 21, tileSize: 48, originX: 0, originY: 8, width: 1536, height: 1024 };',
  torchCode + '\nconst grid = { cols: 32, rows: 21, tileSize: 48, originX: 0, originY: 8, width: 1536, height: 1024 };'
);

pack = pack.replace(
  '...mariaWalkDirections, ...mariaRunDirections,',
  '...mariaWalkDirections, ...mariaRunDirections,\n      ...mariaTorchDirections,'
);

fs.writeFileSync('campaigns/stormwreck-isle/public/pack.ts', pack, 'utf8');
console.log('Updated pack.ts');
