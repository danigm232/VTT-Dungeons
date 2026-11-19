import fs from 'node:fs';

let content = fs.readFileSync('engine/client/terrain3d.ts', 'utf8');

const oldBlock = `    // Navigation retains the sea cells, but one continuous ocean renders them.
    if (rebuilt && ['sea','lower-water','hold-water'].includes(surface.id)) {
      if(surface.id==='sea'&&!contextSurfaces.has(surface.id)) {
        const address={surfaceId:surface.id,cell:tile.cell},p=[[0,0],[1,0],[1,1],[0,1]].map(([u,v])=>corner(address,u!,v!,.12));
        for(let i=0;i<4;i++)addGridSegment(surface.id,[p[i]!,p[(i+1)%4]!],tile.materialId);
      }
      continue;
    }`;

const newBlock = `    // Navigation retains the sea cells, but one continuous ocean renders them.
    if (rebuilt && ['sea','lower-water','hold-water'].includes(surface.id)) {
      continue;
    }`;

// Normalize CRLF to LF for matching, or check both
if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
} else {
  const oldBlockCRLF = oldBlock.replace(/\n/g, '\r\n');
  const newBlockCRLF = newBlock.replace(/\n/g, '\r\n');
  if (content.includes(oldBlockCRLF)) {
    content = content.replace(oldBlockCRLF, newBlockCRLF);
  } else {
    throw new Error('oldBlock not found in terrain3d.ts');
  }
}

fs.writeFileSync('engine/client/terrain3d.ts', content, 'utf8');
console.log('Successfully updated terrain3d.ts');
