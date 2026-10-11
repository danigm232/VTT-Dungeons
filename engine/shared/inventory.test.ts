import { describe, expect, it } from 'vitest';
import { inventoryEquals, inventoryMatches, inventoryStackIndex, inventoryWallet, parseInventoryItem, removeInventoryUnit, useInventoryItem } from './inventory';

describe('inventory presentation and atomic stacks', () => {
  it.each([['4 dagas', 'dagas', 4], ['Dagas ×3', 'Dagas', 3], ['Dagas x 2', 'Dagas', 2], ['Caja3', 'Caja3', 1], ['Antorcha', 'Antorcha', 1], ['Pociones ×0', 'Pociones', 0]])('parses %s without damaging its name', (raw, label, quantity) => {
    expect(parseInventoryItem(raw as string)).toMatchObject({ label, quantity });
  });
  it('keeps narrative quantities and sale prices separate from stacks and money', () => {
    expect(parseInventoryItem('Vino fino: 5 botellas, 10 po cada una').quantity).toBe(1);
    expect(inventoryWallet(['23 po', '50 po', 'Pulsera de oro (25 po)', '5 pp'])).toEqual({ po: 73, pp: 5 });
  });
  it('filters by category, accents and expanded currency names', () => {
    expect(inventoryMatches(parseInventoryItem('Poción de curación ×2'), 'pocion', 'consumables')).toBe(true);
    expect(inventoryMatches(parseInventoryItem('23 po'), 'monedas de oro', 'valuables')).toBe(true);
    expect(inventoryMatches(parseInventoryItem('4 dagas'), 'daga', 'tools')).toBe(false);
  });
  it('handles plurals and does not offer use for arbitrary treasures', () => {
    expect(parseInventoryItem('3 raciones').use).toBe('consume');
    expect(parseInventoryItem('2 pociones de curación').use).toBe('consume');
    expect(parseInventoryItem('Poción de curación').use).toBe('consume');
    expect(parseInventoryItem('Ración').use).toBe('consume');
    expect(parseInventoryItem('Antorchas encendidas ×2').use).toBe('extinguish');
    expect(parseInventoryItem('Libro de conjuros').use).toBeNull();
  });
  it('consumes exactly one unit without touching unrelated entries', () => {
    const stock = ['Mapa secreto', '4 dagas', '23 po'];
    expect(removeInventoryUnit(stock, 1)).toEqual(['Mapa secreto', 'dagas ×3', '23 po']);
    expect(stock[1]).toBe('4 dagas');
    expect(removeInventoryUnit(['Daga'], 0)).toEqual([]);
    expect(removeInventoryUnit(['Daga ×0'], 0)).toBeNull();
  });
  it('rejects stale indexes rather than consuming a different item', () => {
    expect(useInventoryItem(['Ración'], 0, 'Poción', 'consume')).toMatchObject({ ok: false, code: 'INVENTORY_CHANGED' });
    expect(useInventoryItem(['Mapa'], 0, 'Mapa', 'consume')).toMatchObject({ ok: false, code: 'INVALID_INVENTORY_USE' });
  });
  it('lights one torch and extinguishes it without replenishing spent stock', () => {
    const lit = useInventoryItem(['2 antorchas', 'Cuerda'], 0, '2 antorchas', 'light');
    expect(lit).toMatchObject({ ok: true, items: ['antorchas ×1', 'Cuerda', 'Antorcha encendida'] });
    if (!lit.ok) throw new Error('No torch');
    expect(useInventoryItem(lit.items, 2, 'Antorcha encendida', 'extinguish')).toMatchObject({ ok: true, items: ['antorchas ×1', 'Cuerda'] });
  });
  it('does not treat empty or already lit torches as unused supplies', () => {
    expect(inventoryStackIndex(['Antorcha encendida', 'Antorchas ×0', '2 antorchas'], /antorchas?/i)).toBe(2);
    expect(useInventoryItem(['Antorchas ×0'], 0, 'Antorchas ×0', 'light').ok).toBe(false);
  });
  it('preserves the size limit when splitting a torch stack', () => {
    const stock = ['2 antorchas', ...Array(99).fill('Cuerda')];
    expect(useInventoryItem(stock, 0, stock[0]!, 'light')).toMatchObject({ ok: false, code: 'INVENTORY_FULL' });
    expect(inventoryEquals(stock, [...stock])).toBe(true);
    expect(inventoryEquals(stock, ['Cuerda', ...stock.slice(1)])).toBe(false);
  });
});
