import type { CharacterPrivateSeed, EncounterDefinition } from '../../../engine/server/campaign.js';

export const privateCharacterSeeds: Record<string, CharacterPrivateSeed & { sheet: NonNullable<CharacterPrivateSeed['sheet']> }> = {
  mike: { maxHp: 8, inventory: ['Espada corta', 'Saquito de componentes', 'Libro de conjuros', 'Mochila'], sheet: { level: 1, armorClass: 12, speedMeters: 9, background: 'Erudito', features: ['Alto elfo', 'Recuperación arcana'], attacks: ['Espada corta'], spells: ['Libro de conjuros · consulta con el DM'] }, explorationBasics: ['jump'] },
  mia: { maxHp: 11, inventory: ['Cota de malla', 'Escudo', 'Maza', 'Hacha de mano', 'Símbolo sagrado', 'Mochila'], sheet: { level: 1, armorClass: 18, speedMeters: 7.5, background: 'Soldado', features: ['Enana de las colinas', 'Lanzamiento de conjuros divinos'], attacks: ['Maza', 'Hacha de mano'], spells: ['Símbolo sagrado · consulta con el DM'] }, explorationBasics: ['jump'] },
  maria: {
    maxHp: 9,
    inventory: ['Armadura de cuero', 'Arco corto', '20 flechas', '2 dagas', 'Herramientas de ladrón', 'Mochila'],
    sheet: {
      level: 1, armorClass: 14, speedMeters: 7.5, strengthScore: 8, background: 'Criminal',
      features: ['Mediana piesligeros', 'Ataque furtivo · 1d6, una vez por turno', 'Pericia: Sigilo y herramientas de ladrón', 'Jerga de ladrones'],
      attacks: ['Arco corto', 'Dagas'], spells: []
    },
    combat: {
      armorClass: 14, speedMeters: 7.5, initiativeBonus: 3, ruleTraits: { sneakAttackDice: '1d6' },
      attacks: [
        { id: 'shortbow', label: 'Arco corto · +5 · 1d6+3 perforante · 24/96 m', attackBonus: 5, damageDice: '1d6', damageBonus: 3, damageType: 'perforante', range: { kind: 'ranged', normalMeters: 24, longMeters: 96 }, inventoryCost: 'arrow', animationType: 'arrow', soundId: 'd8-night-sfx-attack-swing' },
        { id: 'dagger', label: 'Daga · +5 · 1d4+3 perforante · 1,5 m', attackBonus: 5, damageDice: '1d4', damageBonus: 3, damageType: 'perforante', range: { kind: 'melee', normalMeters: 1.5 }, finesse: true, animationType: 'melee', soundId: 'd8-night-sfx-attack-swing' },
        { id: 'thrown-dagger', label: 'Lanzar daga · +5 · 1d4+3 perforante · 6/18 m', attackBonus: 5, damageDice: '1d4', damageBonus: 3, damageType: 'perforante', range: { kind: 'ranged', normalMeters: 6, longMeters: 18 }, finesse: true, inventoryCost: 'dagger', animationType: 'thrownWeapon', soundId: 'd8-night-sfx-attack-swing' }
      ]
    },
    explorationBasics: ['talk', 'influence', 'help', 'hide', 'search', 'study', 'use-object', 'pick-lock', 'disarm-trap', 'climb', 'swim', 'jump']
  }
};

export const privateEncounterSeed: { creature: EncounterDefinition['creature']; notes: { creature: string; wheel: string } } = {
  creature: {
    id: 'harpy', label: 'Arpía', tokenId: 'harpy', color: '#b65c55', cell: { col: 7, row: 7 },
    // Perfil de criatura de las reglas básicas: se añaden solo las acciones
    // que el motor puede resolver de forma honesta. El Canto cautivador sigue
    // siendo una decisión del DM porque afecta un área y no un único objetivo.
    sheet: {
      maxHp: 38, armorClass: 11, speedMeters: 6,
      traits: ['Vuelo 12 m.', 'Canto cautivador: el DM resuelve sus salvaciones y objetivos según la aventura.'],
      actions: ['Multiataque: una garra y una porra.', 'Canto cautivador: activa el efecto puntual «Canto de arpía» al iniciarlo.'],
      combat: {
        armorClass: 11, speedMeters: 6, initiativeBonus: 1, ruleTraits: { flightMeters: 12 },
        attacks: [
          { id: 'harpy-claws', label: 'Garras · +3 · 2d4+1 cortante · 1,5 m', attackBonus: 3, damageDice: '2d4', damageBonus: 1, damageType: 'cortante', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'd8-night-sfx-attack-swing' },
          { id: 'harpy-club', label: 'Porra · +3 · 1d4+1 contundente · 1,5 m', attackBonus: 3, damageDice: '1d4', damageBonus: 1, damageType: 'contundente', range: { kind: 'melee', normalMeters: 1.5 }, animationType: 'melee', soundId: 'd8-night-sfx-attack-swing' }
        ]
      }
    }
  },
  notes: {
    creature: 'La arpía está fuera al llegar. Revélala tras el disparador oficial o como puesta en escena de prueba.',
    wheel: 'El timón requiere salvación de Destreza CD 10, resuelta con dados físicos.'
  }
};
