import test from 'node:test'
import assert from 'node:assert/strict'
import {sendContact} from '../src/runtime/send.ts'
const endpoint='https://contact.example.com/v1/submissions'
test('JSON POST excludes cookies/referrer and refuses redirects',async()=>{
 let calls=0
 assert.equal(await sendContact(endpoint,{email:'test@example.com'},async(url,options)=>{
  calls++;assert.equal(options.method,'POST');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');return Response.json({code:'accepted_by_provider'},{status:202})
 }),'accepted');assert.equal(calls,1)
})
for(const [label,response,expected]of[
 ['blocked country/IP',()=>Response.json({code:'submission_unavailable'},{status:403}),'rejected'],
 ['challenge failure',()=>Response.json({code:'verification_failed'},{status:403}),'rejected'],
 ['rate limit',()=>Response.json({code:'rate_limited'},{status:429}),'rejected'],
 ['platform HTML',()=>new Response('<h1>CPU limit</h1>',{status:503}),'unknown'],
 ['provider timeout',()=>Response.json({code:'outcome_unknown_do_not_resend'},{status:503}),'unknown'],
 ['duplicate',()=>Response.json({code:'already_submitted'},{status:409}),'unknown'],
 ['fake success',()=>Response.json({code:'ok'},{status:200}),'unknown'],
 ['malformed JSON',()=>new Response('{',{headers:{'content-type':'application/json'}}),'unknown'],
 ['oversized response',()=>new Response('x'.repeat(4097),{headers:{'content-type':'application/json'}}),'unknown'],
 ['transport error',()=>{throw Error('network')},'unknown']
])test(label+' has no automatic retry',async()=>{let calls=0;assert.equal(await sendContact(endpoint,{},async()=>{calls++;return response()}),expected);assert.equal(calls,1)})
test('insecure endpoint or query never sends',async()=>{for(const url of ['http://api.example/v1/submissions',endpoint+'?email=private','https://name:pass@contact.example.com/v1/submissions',endpoint+'#fragment'])assert.equal(await sendContact(url,{},async()=>{throw Error('should not be called')}),'rejected')})
