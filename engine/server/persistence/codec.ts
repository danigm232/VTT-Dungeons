import crypto from 'node:crypto';
import { saveV0Schema, saveV1Schema, type SaveV1 } from './schema.js';

const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
export const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const checksum = (value: { checksum: string }) => {
  const { checksum: _ignored, ...body } = value;
  return crypto.createHash('sha256').update(canonical(body)).digest('hex');
};
export const seal = (body: Omit<SaveV1, 'checksum'>): SaveV1 => saveV1Schema.parse({ ...body, checksum: checksum({ ...body, checksum: '' }) });

// Lexical pass before JSON.parse: JSON.parse silently accepts a duplicate key's last value.
function assertSafeJson(source: string) {
  let i = 0;
  const skip = () => { while (/\s/.test(source[i] ?? '') && i < source.length) i++; };
  const string = () => {
    const start = i;
    if (source[i++] !== '"') throw new Error('INVALID_JSON');
    while (i < source.length) {
      if (source[i] === '\\') { i += 2; continue; }
      if (source[i++] === '"') return JSON.parse(source.slice(start, i)) as string;
    }
    throw new Error('INVALID_JSON');
  };
  const value = (depth: number): void => {
    if (depth > 20) throw new Error('JSON_DEPTH');
    skip();
    if (source[i] === '{') {
      i++; skip(); const keys = new Set<string>();
      if (source[i] === '}') { i++; return; }
      while (true) {
        skip(); const key = string();
        if (keys.has(key) || FORBIDDEN.has(key)) throw new Error('JSON_KEY');
        keys.add(key); skip(); if (source[i++] !== ':') throw new Error('INVALID_JSON');
        value(depth + 1); skip(); const next = source[i++];
        if (next === '}') return;
        if (next !== ',') throw new Error('INVALID_JSON');
      }
    }
    if (source[i] === '[') {
      i++; skip(); if (source[i] === ']') { i++; return; }
      while (true) { value(depth + 1); skip(); const next = source[i++]; if (next === ']') return; if (next !== ',') throw new Error('INVALID_JSON'); }
    }
    if (source[i] === '"') { string(); return; }
    const match = /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(source.slice(i));
    if (!match) throw new Error('INVALID_JSON');
    i += match[0].length;
  };
  value(0); skip(); if (i !== source.length) throw new Error('INVALID_JSON');
}

export function decode(input: string | Buffer): SaveV1 {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  if (bytes.length > 4 * 1024 * 1024) throw new Error('SAVE_TOO_LARGE');
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  assertSafeJson(source);
  const raw: unknown = JSON.parse(source);
  const version = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).schemaVersion : null;
  if (version === 0) {
    const legacy = saveV0Schema.parse(raw);
    if (checksum(legacy) !== legacy.checksum) throw new Error('BAD_CHECKSUM');
    return seal({ ...legacy, schemaVersion: 1, payload: { ...legacy.payload, camera: { mode: 'fixed', focusId: null } } });
  }
  if (typeof version === 'number' && Number.isInteger(version) && version !== 1) throw new Error('SAVE_FORMAT_INCOMPATIBLE');
  const save = saveV1Schema.parse(raw);
  if (checksum(save) !== save.checksum) throw new Error('BAD_CHECKSUM');
  if (new Date(save.savedAt).toISOString() !== save.savedAt) throw new Error('BAD_DATE');
  return save;
}
