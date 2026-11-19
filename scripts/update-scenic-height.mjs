import fs from 'node:fs';

let content = fs.readFileSync('engine/client/wreck-scenic-depth.ts', 'utf8');

const target = `: row === 0 ? .34 : row === 1 ? .55 : .57 + ridge;`;
const replacement = `: row === 0 ? .34 : row === 1 ? .55 : .64 + ridge;`;

if (!content.includes(target)) {
  throw new Error('target not found in wreck-scenic-depth.ts');
}

content = content.replace(target, replacement);
fs.writeFileSync('engine/client/wreck-scenic-depth.ts', content, 'utf8');
console.log('Updated row 2 height in wreck-scenic-depth.ts');
