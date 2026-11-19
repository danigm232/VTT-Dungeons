import fs from 'node:fs';

let txt = fs.readFileSync('engine/client/wreck-exterior.ts', 'utf8');

const oldBreach = `  // Starboard visible hull breach: broken timber ribs, splintered strakes, and hanging kelp
  for (const rx of [-12.8, -11.2, -9.8]) {
    const points = bands.slice(2, 7).map((y, i) => at(rx, y, wreckBeamAt(rx) * fullness[i + 2]! - .18));
    for (let i = 0; i < points.length - 1; i++) {
      beam(\`starboard-torn-rib:\${rx}:\${i}\`, points[i]!, points[i + 1]!, .22, .24, edge, 'c1-hull', 'fractured-rib');
    }
  }
  for (let i = 0; i < 8; i++) {
    const bx = -13.5 + (i / 7) * 4.5;
    const by = bands[3]! + (i % 3) * 0.9;
    const bz = wreckBeamAt(bx) * fullness[4]!;
    beam(\`starboard-splinter:\${i}\`, at(bx, by, bz), at(bx + (i % 2 === 0 ? .28 : -.24), by + .15, bz + .18), .075, .095, endgrain, 'c1-hull', 'breach-splinter');
    if (i % 2 === 0) {
      const kelpPath = [at(bx, by, bz + .05), at(bx + .08, by - .38, bz + .12), at(bx + .02, by - .82, bz + .16)];
      const k = MeshBuilder.CreateTube(\`wreck:starboard-kelp:\${i}\`, { path: kelpPath, radius: .032, tessellation: 5 }, scene);
      k.material = kelp; mark(k, 'c1-hull', 'hull-kelp', by - .82, by);
    }
  }`;

const newBreach = `  // Starboard visible hull breach: 3 curved oak frames/ribs, splintered strakes, and hanging kelp
  for (const rx of [-12.8, -11.2, -9.8]) {
    const points = bands.slice(2, 7).map((y, i) => at(rx, y, wreckBeamAt(rx) * fullness[i + 2]! - .14));
    for (let i = 0; i < points.length - 1; i++) {
      beam(\`starboard-torn-rib:\${rx}:\${i}\`, points[i]!, points[i + 1]!, .26, .28, edge, 'c1-hull', 'fractured-rib');
    }
  }
  for (let i = 0; i < 9; i++) {
    const bx = -13.8 + (i / 8) * 5.0;
    const by = bands[3]! + (i % 3) * 0.85;
    const bz = wreckBeamAt(bx) * fullness[4]!;
    beam(\`starboard-splinter:\${i}\`, at(bx, by, bz), at(bx + (i % 2 === 0 ? .32 : -.28), by + .18, bz + .22), .085, .11, endgrain, 'c1-hull', 'breach-splinter');
    if (i % 2 === 0 || i === 5) {
      const kelpPath = [at(bx, by, bz + .05), at(bx + .09, by - .42, bz + .14), at(bx + .03, by - .92, bz + .18), at(bx - .04, by - 1.35, bz + .22)];
      const k = MeshBuilder.CreateTube(\`wreck:starboard-kelp:\${i}\`, { path: kelpPath, radius: .038, tessellation: 5 }, scene);
      k.material = kelp; mark(k, 'c1-hull', 'hull-kelp', by - 1.35, by);
    }
  }`;

if (txt.includes(oldBreach)) {
  txt = txt.replace(oldBreach, newBreach);
  fs.writeFileSync('engine/client/wreck-exterior.ts', txt, 'utf8');
  console.log('Successfully updated starboard breach in wreck-exterior.ts');
} else {
  console.error('Could not find oldBreach block in wreck-exterior.ts');
}
