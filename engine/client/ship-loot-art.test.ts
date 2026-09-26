import { describe, expect, it } from 'vitest';
import { shipLootIconIndex } from './ship-loot-art.js';

describe('M5 · arte de botín revelado', () => {
  it('cubre los seis resultados de C8 sin compartir el mismo icono', () => {
    const results = ['Vino fino: 5 botellas', 'Clavo de olor: 10 kg', 'Lingotes de plata: 10',
      'Candelabros de hueso de dragón tallado', 'Laúd: 50 po', 'Pergamino de Orden imperiosa'];
    expect(results.map(shipLootIconIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it('cubre el tesoro de C4, C6, C9, la cofa y las antorchas sin etiquetar equipo normal', () => {
    for (const label of ['Bolsa con 200 po', 'Tres turquesas', 'Botas élficas', 'Paquete encerado',
      'Diario de Aleitha', 'Talismán de Aleitha', 'Antorcha', 'Herramientas de cartógrafo', 'Daga', 'Brújula',
      'Pulsera de oro', 'Pendiente de oro', 'Gema ojo de tigre', 'Heliotropo'])
      expect(shipLootIconIndex(label)).not.toBeNull();
    expect(shipLootIconIndex('Espada corta')).toBeNull();
  });
});
