import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestSafeTableShutdown } from './safe-table-shutdown.mjs';
test('never closes an older server without a confirmed-save contract', async () => {
  const calls = [];
  await assert.rejects(requestSafeTableShutdown({ port: 3000, token: 'test', request: async (_url, options) => {
    calls.push(options.method ?? 'GET'); return new Response('{}', { status: 404 });
  } }), /servidor anterior/);
  assert.deepEqual(calls, ['GET']);
});
test('refuses restart if final saving fails', async () => {
  await assert.rejects(requestSafeTableShutdown({ port: 3000, token: 'test', request: async (_url, options) =>
    options.method === 'POST' ? new Response('{"ok":false}', { status: 503 }) : Response.json({ saveBeforeShutdown: true })
  }), /cancelado la actualización/);
});
test('accepts only an explicit acknowledgement after saving', async () => {
  const calls = [];
  await requestSafeTableShutdown({ port: 3000, token: 'test', request: async (_url, options) => {
    calls.push(options.method ?? 'GET');
    return options.method === 'POST' ? Response.json({ ok: true, safeToRestart: true }, { status: 202 }) : Response.json({ saveBeforeShutdown: true });
  } });
  assert.deepEqual(calls, ['GET','POST']);
});
