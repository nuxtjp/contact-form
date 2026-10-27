import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const require=createRequire(import.meta.resolve('wrangler/package.json'))
const {Miniflare,convertV4MiniflareOptions}=require('miniflare')
const mf=new Miniflare(convertV4MiniflareOptions({modules:[{type:'ESModule',path:'test/worker-harness.mjs'},{type:'ESModule',path:'build/index.js'},{type:'ESModule',path:'build/worker/shim.mjs'},{type:'CompiledWasm',path:'build/worker/index.wasm'}],compatibilityDate:'2026-10-26',durableObjects:{RECEIPTS_NAMESPACE:{className:'ContactReceipts',useSQLite:true}}}))
const value=JSON.parse(await readFile(new URL('../contracts/submission-vectors.json',import.meta.url),'utf8'))[0].value
let checks=0
async function request(mode='normal',patch={},options={}){
 const response=await mf.dispatchFetch('https://contact.example.com/v1/submissions',{method:'POST',headers:{origin:'https://hat-tech.co.jp','content-type':'application/json','x-test-mode':mode},body:JSON.stringify({...value,submissionId:crypto.randomUUID(),...patch}),...options})
 return {status:response.status,body:await response.json(),headers:response.headers}
}
try{
 for(const [mode,status,verify]of[['normal',202,1],['disabled',403,0],['all-disabled',403,0],['global-denied',403,0],['vars-object',503,0],['missing-flag',503,0],['missing',503,0],['missing-secret',503,0],['no-ip',403,0],['no-cf',403,0],['redirect',503,1],['huge-verification',503,1],['config',503,0],['denied',403,0],['rate',429,0],['failed',403,1],['hostname',403,1],['action',403,1],['expired',403,1],['unknown',503,1]]){
  const r=await request(mode);assert.equal(r.status,status,JSON.stringify({mode,...r}));assert.equal(r.body.calls.verify,verify)
  if(['disabled','all-disabled','global-denied','vars-object','missing-flag'].includes(mode))assert.equal(r.body.calls.limit,0)
  assert.equal(r.body.calls.email.length,['normal','unknown'].includes(mode)?1:0);checks++
  if(mode==='normal'){const m=r.body.calls.email[0];assert.equal(m.to,'contact@hat-tech.co.jp');assert.equal(m.replyTo,'person@example.com');assert.equal(m.html,undefined);assert.equal(r.headers.get('cache-control'),'no-store')}
 }
 for(const mode of ['normal','coela-disabled']){
  const r=await request(mode,{siteKey:'coela'},{headers:{origin:'https://coela.org','content-type':'application/json','x-test-mode':mode}})
  assert.equal(r.status,mode==='normal'?202:403);assert.equal(r.body.calls.email.length,mode==='normal'?1:0)
  if(mode==='normal')assert.equal(r.body.calls.email[0].to,'contact@coela.org');checks++
 }
 for(const [mode,email,status] of [['normal',undefined,400],['normal','',400],['email-optional',undefined,202],['email-optional','',202],['email-optional','person@example.com',202],['email-optional','bad',400],['email-disabled',undefined,202],['email-disabled','person@example.com',400]]) {
  const r=await request(mode,{email});assert.equal(r.status,status,JSON.stringify({mode,email,...r}))
  assert.equal(r.body.calls.email.length,status===202?1:0)
  if(status===202)assert.equal(r.body.calls.email[0].replyTo,email || undefined)
  else assert.equal(r.body.calls.verify,0)
  checks++
 }
 const paused=await request('coela-disabled');assert.equal(paused.status,202);checks++
 const rows=JSON.parse(await readFile(new URL('../contracts/submission-vectors.json',import.meta.url),'utf8'))
 for(const row of rows.filter(r=>!r.valid)){const r=await request('normal',row.value);assert.equal(r.status,400,row.name);assert.equal(r.body.calls.verify,0);checks++}
 for(const [options,status]of[[{headers:{origin:'https://evil.example','content-type':'application/json'}},403],[{headers:{origin:'https://hat-tech.co.jp','content-type':'text/plain'}},415],[{method:'GET',body:undefined},405]]){assert.equal((await request('normal',{},options)).status,status);checks++}
 for(const patch of [{siteKey:'other'},{policyVersion:'urn:coela:legal:fixture:policy@'+'b'.repeat(40)}]){const r=await request('normal',patch);assert.equal(r.status,400);assert.equal(r.body.calls.verify,0);checks++}
 const preflight=await mf.dispatchFetch('https://contact.example.com/v1/submissions',{method:'OPTIONS',headers:{origin:'https://hat-tech.co.jp','access-control-request-method':'POST','access-control-request-headers':'authorization'}});assert.equal(preflight.status,403);checks++
 const query=await mf.dispatchFetch('https://contact.example.com/v1/submissions?email=private');assert.equal(query.status,404);checks++
 const id=crypto.randomUUID();assert.equal((await request('unknown',{submissionId:id})).body.code,'outcome_unknown_do_not_resend');const duplicate=await request('normal',{submissionId:id});assert.equal(duplicate.status,409);assert.equal(duplicate.body.calls.email.length,0);checks++
 const results=await Promise.all(Array.from({length:12},()=>mf.dispatchFetch('https://contact.example.com/test-reservation',{method:'POST'})))
 assert.equal(results.filter(r=>r.status===201).length,1);assert.equal(results.filter(r=>r.status===409).length,11);checks++
 console.log(`Passed ${checks} actual Rust/Wasm admission and SQLite concurrency checks; no real mail or provider credentials.`)
}finally{await mf.dispose()}
