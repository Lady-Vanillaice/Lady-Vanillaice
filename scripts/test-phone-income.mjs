import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const exports = {};
const createServerFn = () => ({ middleware() { return this; }, inputValidator(parse) { this.parse = parse; return this; }, handler(fn) { const parse = this.parse; return args => fn({ ...args, data: parse(args.data) }); } });
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/cashbook.functions.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>id==='@tanstack/react-start'?{createServerFn}:id.includes('auth-middleware')?{requireSupabaseAuth:{}}:require(id)});
let saved;
const context = {userId:'admin',supabase:{from(table){return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{role:'admin'}}),insert(value){saved=value;return this;},single:async()=>({data:{id:'saved'}})};}}};
const base={studio:'Telefon-Session',datum:'2026-09-30',kunde:'Testkunde',anzahlung:50,anzahlung_method:'PayPal',anzahlung_datum:'2026-09-30',bar:0};
for(const amount of [50,75,100]) {
 await exports.createCashBookEntry({data:{...base,anzahlung:amount},context});
 assert.equal(saved.anzahlung,amount);assert.equal(saved.bar,0);assert.equal(saved.studio,'Telefon-Session');assert.equal(saved.anzahlung_method,'PayPal');assert.match(saved.notiz,/2026-09-30/);
}
for(const change of [{anzahlung:60},{anzahlung_method:''},{anzahlung_datum:'2026-02-30'},{kunde:' '},{bar:50}]) {
 await assert.rejects(async()=>exports.createCashBookEntry({data:{...base,...change},context}),/Telefon-Session/);
}
console.log('Telefon-Session: all three amounts, payment metadata, invalid amounts and incomplete inputs checked.');
