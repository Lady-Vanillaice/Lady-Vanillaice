import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const exports = {};
const files = new Map();
const bucket = {
  async upload(path, body) { files.set(path, body); return { error: null }; },
  async download(path) { return files.has(path) ? { data: new Blob([files.get(path)]) } : { error: { statusCode: '404' } }; },
};
const db = { from(table) { assert.equal(table, 'bookings'); return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: 'booking' } }; } }; } };
const createServerFn = () => ({ middleware() { return this; }, inputValidator(parse) { this.parse = parse; return this; }, handler(fn) { const parse = this.parse; return args => fn({ ...args, data: parse(args.data) }); } });
const dependencies = {
  '@tanstack/react-start': { createServerFn },
  '@/integrations/supabase/auth-middleware': { requireSupabaseAuth: {} },
  '@/integrations/supabase/client.server': { supabaseAdmin: db },
  './private-booking-location.server': { privateLocationBucket: async () => bucket },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/booking-rest-time.functions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => dependencies[id] ?? require(id) });
const context = admin => ({ userId: 'test', supabase: { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: admin ? { role: 'admin' } : null }; } }; } } });
const id = '11111111-1111-4111-8111-111111111111';
assert.equal(await exports.getBookingRestTime({ data: { id }, context: context(true) }), 0);
await exports.saveBookingRestTime({ data: { id, minutes: 90 }, context: context(true) });
assert.equal(await exports.getBookingRestTime({ data: { id }, context: context(true) }), 90);
await exports.saveBookingRestTime({ data: { id, minutes: 0 }, context: context(true) });
assert.equal(await exports.getBookingRestTime({ data: { id }, context: context(true) }), 0);
for (const minutes of [-1, 1.5, 1441]) await assert.rejects(async () => exports.saveBookingRestTime({ data: { id, minutes }, context: context(true) }));
await assert.rejects(() => exports.saveBookingRestTime({ data: { id, minutes: 30 }, context: context(false) }), /Forbidden/);
await assert.rejects(() => exports.getBookingRestTime({ data: { id }, context: context(false) }), /Forbidden/);
assert.equal(files.size, 1);
assert.ok(files.has(`rest-time/${id}.json`));
console.log('Liegezeit: save/reload/reset, admin access and valid durations checked; no availability or session duration writes.');
