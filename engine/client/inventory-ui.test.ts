import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inventoryCategories } from '../shared/inventory';
import { inventoryGlyph } from './inventory-icons';

describe('RPG inventory UI integration contract', () => {
  it('provides each control referenced by the widget exactly once', () => {
    const html = readFileSync('apps/web/player.html', 'utf8');
    const widget = readFileSync('apps/web/ui/inventory.ts', 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const controls = [...widget.matchAll(/this\.get(?:<[^>]+>)?\('([^']+)'\)/g)].map(match => match[1]);
    for (const control of controls) expect(ids.filter(id => id === control), control).toHaveLength(1);
    expect(html).toContain('href="/apps/web/inventory.css"');
    expect(html).toContain('aria-labelledby="inventoryTitle"');
    expect(html).toContain('aria-live="polite"');
  });
  it('has a local scalable glyph for every category and navigation control', () => {
    for (const category of [...Object.keys(inventoryCategories), 'backpack', 'search'] as Parameters<typeof inventoryGlyph>[0][]) {
      const icon = inventoryGlyph(category);
      expect(icon).toContain('viewBox="0 0 24 24"');
      expect(icon).toContain('aria-hidden="true"');
      expect(icon).not.toMatch(/https?:|<script|undefined/);
    }
  });
  it('does not recreate client-side whole-pack replacements for quick use', () => {
    const source = readFileSync('apps/web/player.ts', 'utf8');
    expect(source).toContain("'player:inventory-use'");
    expect(source).not.toContain('function consumeInventoryItem(');
    expect(source).not.toContain('function setInventoryTorchLit(');
    expect(source).toContain('backpack.reset();');
  });
});
