import fs from 'node:fs';
import { seal } from '../engine/server/persistence/codec.js';

const raw = JSON.parse(fs.readFileSync('data/saves/stormwreck-isle/active.json', 'utf8'));

for (const char of raw.payload.characters || []) {
  if (!char.inventory.includes('Antorcha') && !char.inventory.includes('Antorcha encendida')) {
    char.inventory.push('Antorcha');
    console.log(`Added Antorcha to ${char.id || char.label || 'character'}`);
  }
}

const sealed = seal(raw);
fs.writeFileSync('data/saves/stormwreck-isle/active.json', JSON.stringify(sealed, null, 2), 'utf8');
console.log('Successfully updated active.json with torches for all characters');
