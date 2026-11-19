import fs from 'node:fs';

let c = fs.readFileSync('engine/client/wreck-exterior.ts', 'utf8');

// 1. Add opening to shell panels on starboard
c = c.replace(
  'if (side===1 && x<wreckSideBreachEnd && b>=1 && b<=3) continue;',
  'if (side===1 && ((x<wreckSideBreachEnd && b>=1 && b<=3) || (x>=-13.5 && x<=-9.0 && b>=3 && b<=5))) continue;'
);

// 2. Also skip wale on starboard over the breach
c = c.replace(
  'if(side===1 && b<4 && strake[i]!.x-S.origin.x<-29)continue;',
  'if(side===1 && ((b<4 && strake[i]!.x-S.origin.x<-29) || (b>=3 && b<=5 && strake[i]!.x-S.origin.x>=-14 && strake[i]!.x-S.origin.x<=-8.5)))continue;'
);

// 3. Break starboard bulwark near the breach
c = c.replace(
  "if(surface==='c3' && z>0 && x<-26 || surface==='c2' && z<0 && x>26) {",
  "if((surface==='c3' && z>0 && x<-26) || (surface==='c2' && z<0 && x>26) || (surface==='main' && z>6 && x>=-13.5 && x<=-7.5)) {"
);

// 4. Insert starboard breach ribs, splinters and kelp
const starboardBreachSnippet = `
  // Starboard visible hull breach: broken timber ribs, splintered strakes, and hanging kelp
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
  }
`;

c = c.replace(
  "beam('stem',at(S.bowX-.2,-5.6,0),at(S.bowX+.05,3.32,0),.22,.28,edge,'c1-hull','stem');",
  "beam('stem',at(S.bowX-.2,-5.6,0),at(S.bowX+.05,3.32,0),.22,.28,edge,'c1-hull','stem');" + starboardBreachSnippet
);

fs.writeFileSync('engine/client/wreck-exterior.ts', c, 'utf8');
console.log('Successfully updated wreck-exterior.ts');
