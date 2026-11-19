import fs from 'node:fs';

const file = 'campaigns/stormwreck-isle/private/m3-actors.ts';
let content = fs.readFileSync(file, 'utf8');

const target = `export const zombieCombatProfile: CombatProfile = {
  armorClass: 8, speedMeters: 6, maxHp: 22, initiativeBonus: -2,
  attacks: [{ id: 'zombie-slam', label: 'Golpe · +3 · 1d6+1 contundente', attackBonus: 3, damageDice: '1d6', damageBonus: 1,
    damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-zombie-groan' }],
  traits: ['Fortaleza de no muerto: si queda a 0 PG, el DM resuelve la salvación de Constitución CD 5 + daño recibido; no se automatiza.'],
  ruleTraits: { darkvisionMeters: 18 }, damageImmunities: ['veneno'], conditionImmunities: ['envenenada']
};`;

const replacement = `export const zombieCombatProfile: CombatProfile = {
  armorClass: 8, speedMeters: 6, maxHp: 22, initiativeBonus: -2,
  attacks: [
    { id: 'zombie-slam', label: 'Golpe · +3 · 1d6+1 contundente', attackBonus: 3, damageDice: '1d6', damageBonus: 1,
      damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-zombie-groan' },
    { id: 'zombie-bite', label: 'Desgarrar · mordisco · +3 · 1d4+1 perforante', attackBonus: 3, damageDice: '1d4', damageBonus: 1,
      damageType: 'perforante', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-undead-cry' },
    { id: 'zombie-grapple', label: 'Presa · agarre marino · alcance 1,5 m', attackBonus: 3, damageDice: '1d1', damageBonus: 0,
      damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'stormwreck-sfx-zombie-groan-02' }
  ],
  traits: ['Fortaleza de no muerto: si queda a 0 PG, el DM resuelve la salvación de Constitución CD 5 + daño recibido; si supera la tirada, se levanta con 1 PG.'],
  ruleTraits: { darkvisionMeters: 18 }, damageImmunities: ['veneno'], conditionImmunities: ['envenenada']
};`;

content = content.replace(/\r\n/g, '\n');
if (!content.includes(target)) {
  console.error('Target not found in m3-actors.ts!');
  process.exit(1);
}
content = content.replace(target, replacement).replace(/\n/g, '\r\n');
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated m3-actors.ts!');
