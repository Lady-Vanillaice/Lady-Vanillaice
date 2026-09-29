import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const schema = require('../src/lib/customer-session.schema.ts');
function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => dependencies[id] ?? require(id) });
  return exports;
}
const storage = load('src/lib/customer-session.server.ts', { './customer-session.schema': schema });
const files = new Map();
let info = null, emailPattern = null;
const bookingId = '11111111-1111-4111-8111-111111111111';
const manualId = '22222222-2222-4222-8222-222222222222';
let owner = 'test_customer@example.com';
const bucket = {
  async upload(path, body) { files.set(path, body); return { error: null }; },
  async list(prefix, { offset, limit }) { return { data: [...files.keys()].filter(key => key.startsWith(prefix + '/')).sort().slice(offset, offset + limit).map(key => ({ name: key.slice(prefix.length + 1) })), error: null }; },
  async download(path) { return { data: new Blob([files.get(path)]), error: null }; },
};
const db = { storage: {
  async getBucket() { return info ? { data: info, error: null } : { error: { statusCode: '404' }, data: null }; },
  async createBucket(name, options) { assert.equal(options.public, false); info = { public: false }; return { error: null }; },
  from(name) { assert.equal(name, 'private-customer-sessions'); return bucket; },
}, from() { return {
  select() { return this; }, eq() { return this; }, ilike(field, pattern) { emailPattern = pattern; return this; }, order() { return this; },
  async returns() { return { error: null, data: [{ id: bookingId, requested_start: '2026-10-12T08:00:00Z', status: 'confirmed', studio_override: null, availability_slots: { starts_at: '', location: 'Teststudio' } }] }; },
  async maybeSingle() { return { error: null, data: owner ? { guest_email: owner } : null }; },
}; } };
const plain = value => JSON.parse(JSON.stringify(value));
const base = { id: bookingId, bookingId, date: '2026-10-12', time: '10:00', place: 'Teststudio', activities: 'Besprochener Ablauf', liked: 'Positive Rückmeldung', disliked: 'Notierte Grenze', nextTime: 'Hinweis fürs nächste Mal', notes: 'Interne Notiz' };
assert.equal(storage.customerSessionKey(' Test@Example.com '), storage.customerSessionKey('test@example.com'));
assert.notEqual(storage.customerSessionKey('a@example.com'), storage.customerSessionKey('b@example.com'));
assert.equal((await storage.readCustomerSessions(db, owner)).length, 0);
await storage.writeCustomerSession(db, owner, base);
assert.equal((await storage.readCustomerSessions(db, 'other@example.com')).length, 0);
await storage.writeCustomerSession(db, owner, { ...base, activities: 'Korrigierter Ablauf' });
assert.equal(files.size, 1);
assert.equal((await storage.readCustomerSessions(db, owner))[0].activities, 'Korrigierter Ablauf');
await storage.writeCustomerSession(db, owner, { ...base, id: manualId, bookingId: null, date: '2026-09-01' });
assert.deepEqual(plain((await storage.readCustomerSessions(db, owner)).map(entry => entry.id)), [bookingId, manualId]);
assert.ok([...files.keys()].every(key => !key.includes('@')));
info.public = true;
await assert.rejects(() => storage.readCustomerSessions(db, owner), /geschützte/);
await assert.rejects(() => storage.writeCustomerSession(db, owner, base), /geschützte/);
info.public = false;
function createServerFn() { return { middleware(values) { assert.equal(values.length, 1); return this; }, inputValidator(parse) { this.parse = parse; return this; }, handler(fn) { const parse = this.parse; return args => fn({ ...args, data: parse(args.data) }); } }; }
const functions = load('src/lib/customer-session.functions.ts', {
  '@tanstack/react-start': { createServerFn }, '@/integrations/supabase/auth-middleware': { requireSupabaseAuth: {} },
  './customer-session.schema': schema, './customer-session.server': storage,
  '@/integrations/supabase/client.server': { supabaseAdmin: db },
});
const context = admin => ({ userId: 'user', supabase: { from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: admin ? { role: 'admin' } : null, error: null }; } }; } } });
await assert.rejects(() => functions.getCustomerSessionHistory({ context: context(false), data: { email: owner } }), /Forbidden/);
await assert.rejects(() => functions.saveCustomerSession({ context: context(false), data: { email: owner, entry: base } }), /Forbidden/);
await assert.rejects(() => functions.saveCustomerSession({ context: context(true), data: { email: 'other@example.com', entry: base } }), /anderen Kunden/);
const history = await functions.getCustomerSessionHistory({ context: context(true), data: { email: owner } });
assert.equal(emailPattern, 'test\\_customer@example.com');
assert.equal(history.bookings[0].time, '10:00');
assert.equal(history.sessions.length, 2);
await functions.saveCustomerSession({ context: context(true), data: { email: owner.toUpperCase(), entry: base } });
assert.equal(files.size, 2);
assert.throws(() => schema.customerSessionSchema.parse({ ...base, date: '2026-02-30' }));
assert.throws(() => schema.customerSessionSchema.parse({ ...base, id: '../outside' }));
console.log('CRM checks passed: private storage, customer isolation, admin access, edit without duplication, chronological history, literal email matching, date validation.');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ui = load('src/components/admin/CustomerSessionHistory.tsx', {
  '@tanstack/react-router': { Link: ({ children }) => React.createElement('a', null, children) },
  '@tanstack/react-query': {
    useQuery: () => ({ data: { bookings: history.bookings, sessions: [{ ...base, activities: '<private text>', updatedAt: new Date().toISOString() }, { ...base, id: manualId, bookingId: null, date: '2026-09-01' }] }, isSuccess: true }),
    useQueryClient: () => ({}), useMutation: () => ({}),
  },
  '@tanstack/react-start': { useServerFn: fn => fn },
  '@/lib/customer-session.functions': functions,
});
const markup = renderToStaticMarkup(React.createElement(ui.CustomerSessionHistory, { email: owner }));
assert.ok(markup.includes('Session nachtragen'));
assert.ok(markup.includes('Buchung öffnen'));
assert.ok(markup.indexOf('12.10.2026') < markup.indexOf('01.09.2026'));
assert.ok(markup.includes('&lt;private text&gt;'));
assert.equal((markup.match(/12\.10\.2026/g) ?? []).length, 1);
console.log('CRM rendering passed: newest first, linked booking appears once, escaped notes, manual entry action.');
