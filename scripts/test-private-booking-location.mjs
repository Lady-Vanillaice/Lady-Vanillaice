import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const schema = require('../src/lib/private-booking-location.schema.ts');
function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => dependencies[id] ?? require(id) });
  return exports;
}
const storage = load('src/lib/private-booking-location.server.ts', { './private-booking-location.schema': schema });
let bucketInfo = null;
const files = new Map();
let writes = 0;
const bucket = {
  async upload(path, body, options) { assert.equal(options.upsert, true); files.set(path, body); writes++; return { error: null }; },
  async download(path) { return files.has(path) ? { data: new Blob([files.get(path)]), error: null } : { error: { statusCode: '404' }, data: null }; },
};
const db = { storage: {
  async getBucket() { return bucketInfo ? { data: bucketInfo, error: null } : { data: null, error: { statusCode: '404' } }; },
  async createBucket(name, options) { assert.equal(options.public, false); bucketInfo = { public: false }; return { error: null }; },
  from(name) { assert.equal(name, 'private-booking-locations'); return bucket; },
}, from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: 'booking' }, error: null }; } }; } };
assert.equal(await storage.privateLocationBucket(db), null);
const value = { name: 'Testhotel', address: 'Teststraße 1, 12345 Testort', notes: 'Zimmer 123, nur intern' };
await storage.writePrivateLocation(db, 'booking', value);
assert.deepEqual(await storage.readPrivateLocation(bucket, 'booking'), value);
assert.equal(await storage.readPrivateLocation(bucket, 'missing'), null);
bucketInfo.public = true;
await assert.rejects(() => storage.writePrivateLocation(db, 'booking', value), /geschützte/);
assert.equal(writes, 1);
bucketInfo.public = false;
function createServerFn() {
  return { middleware(values) { assert.equal(values.length, 1); return this; }, inputValidator(parse) { this.parse = parse; return this; }, handler(fn) { const parse = this.parse; return (args) => fn({ ...args, data: parse(args.data) }); } };
}
const functions = load('src/lib/private-booking-location.functions.ts', {
  '@tanstack/react-start': { createServerFn },
  '@/integrations/supabase/auth-middleware': { requireSupabaseAuth: {} },
  './private-booking-location.schema': schema,
  './private-booking-location.server': storage,
  '@/integrations/supabase/client.server': { supabaseAdmin: db },
});
const context = (admin) => ({ userId: 'user', supabase: { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { error: null, data: admin ? { role: 'admin' } : null }; } }; } } });
const id = '11111111-1111-4111-8111-111111111111';
for (const [fn, data] of [[functions.getPrivateBookingLocation, { id }], [functions.savePrivateBookingLocation, { id, location: value }], [functions.listPrivateBookingDestinations, { ids: [id] }]]) {
  await assert.rejects(() => fn({ data, context: context(false) }), /Forbidden/);
}
assert.equal(writes, 1);
await functions.savePrivateBookingLocation({ data: { id, location: value }, context: context(true) });
assert.deepEqual(await functions.getPrivateBookingLocation({ data: { id }, context: context(true) }), value);
const destinations = await functions.listPrivateBookingDestinations({ data: { ids: [id] }, context: context(true) });
assert.equal(destinations[id].address, value.address);
assert.equal('notes' in destinations[id], false);
await functions.savePrivateBookingLocation({ data: { id, location: { name: '', address: '', notes: '' } }, context: context(true) });
assert.equal(Object.keys(await functions.listPrivateBookingDestinations({ data: { ids: [id] }, context: context(true) })).length, 0);
console.log('Private location: admin access, private storage, save/reload, public-bucket rejection, and travel-note exclusion passed.');
