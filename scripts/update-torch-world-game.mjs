import fs from 'node:fs';

// 1. Update world.ts
let world = fs.readFileSync('apps/web/world.ts', 'utf8');

world = world.replace(
  `    if (moving) {
      const suffix = facingSuffix[this.cameraRelativeFacing(view.entity.facing)], facing = \`direction-\${suffix}\`;`,
  `    const hasTorch = (view.entity.carriedLightRadiusMeters ?? 0) > 0;
    if (moving) {
      const suffix = facingSuffix[this.cameraRelativeFacing(view.entity.facing)], facing = \`direction-\${suffix}\`;
      const movement = this.snapshot?.combat.movement, participant = this.snapshot?.combat.participants.find(item => item.id === view.entity.id);
      const normalSquares = participant ? Math.floor(participant.speedMeters / 1.5) : 0;
      if (hasTorch) {
        if (movement?.actorId === view.entity.id && movement.maximumSquares > normalSquares) {
          if (this.animationFor(view.entity.tokenId, \`torch-run-\${suffix}\`)) return \`torch-run-\${suffix}\`;
        }
        if (this.animationFor(view.entity.tokenId, \`torch-walk-\${suffix}\`)) return \`torch-walk-\${suffix}\`;
      }`
);

world = world.replace(
  `    const state = this.snapshot?.combat.active ? 'combat-idle' : standing ? 'idle-standing' : 'idle';
    if (view.entity.facing) {
      const directed = \`\${state}-\${facingSuffix[this.cameraRelativeFacing(view.entity.facing)]}\`;
      if (this.animationFor(view.entity.tokenId, directed)) return directed;
    }`,
  `    const hasTorch = (view.entity.carriedLightRadiusMeters ?? 0) > 0;
    if (hasTorch && view.entity.facing) {
      const torchIdle = \`torch-idle-\${facingSuffix[this.cameraRelativeFacing(view.entity.facing)]}\`;
      if (this.animationFor(view.entity.tokenId, torchIdle)) return torchIdle;
    }
    const state = this.snapshot?.combat.active ? 'combat-idle' : standing ? 'idle-standing' : 'idle';
    if (view.entity.facing) {
      const directed = \`\${state}-\${facingSuffix[this.cameraRelativeFacing(view.entity.facing)]}\`;
      if (this.animationFor(view.entity.tokenId, directed)) return directed;
    }`
);

fs.writeFileSync('apps/web/world.ts', world, 'utf8');
console.log('Updated apps/web/world.ts');

// 2. Update game.ts
let game = fs.readFileSync('engine/server/game.ts', 'utf8');

game = game.replace(
  "this.emitBasicActionAnimation(character.id, 'use-object');",
  "const anim = parsed.data.action === 'light' ? 'extraer-antorcha' : parsed.data.action === 'extinguish' ? 'guardar-antorcha' : 'use-object';\n    this.emitBasicActionAnimation(character.id, anim as any);"
);

game = game.replace(
  "private emitBasicActionAnimation(entityId: string, action: BasicCombatAction) {",
  "private emitBasicActionAnimation(entityId: string, action: BasicCombatAction | 'extraer-antorcha' | 'guardar-antorcha') {\n    const animState = action === 'extraer-antorcha' ? 'extraer-antorcha' : action === 'guardar-antorcha' ? 'guardar-antorcha' : basicCombatActionAnimationStates[action as BasicCombatAction];"
);

game = game.replace(
  "state: basicCombatActionAnimationStates[action],",
  "state: animState,"
);

game = game.replace(
  "else if (action === 'hide' || action === 'use-object') this.emitProjectorSfx('d8-night-sfx-world-leather-pack');",
  "else if (action === 'extraer-antorcha') this.emitProjectorSfx('pixabay-magic-fire');\n    else if (action === 'guardar-antorcha' || action === 'hide' || action === 'use-object') this.emitProjectorSfx('d8-night-sfx-world-leather-pack');"
);

fs.writeFileSync('engine/server/game.ts', game, 'utf8');
console.log('Updated engine/server/game.ts');
