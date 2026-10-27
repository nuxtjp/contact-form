import {test} from 'node:test'
import assert from 'node:assert/strict'
import {publicOptions,validPrivacyUrl} from '../src/runtime/config.ts'
test('public options reject server secrets and default to preview',()=>{
 assert.equal(publicOptions({}).mode,'preview')
 for(const key of ['turnstileSecret','apiToken','TURNSTILE_SECRET','__proto__'])assert.throws(()=>publicOptions(JSON.parse('{"'+key+'":"must-not-appear"}')))
})
test('live mode requires pinned policy, secure endpoint and a safe privacy link',()=>{
 const valid={mode:'live',endpoint:'https://api.example.com/v1/submissions',siteKey:'fixture',turnstileSiteKey:'public',policyVersion:'urn:coela:legal:fixture:policy@'+'a'.repeat(40),privacyUrl:'/privacy/'}
 assert.equal(publicOptions(valid).mode,'live')
 for(const bad of [{endpoint:'http://api.example.com/v1/submissions'},{policyVersion:'latest'},{privacyUrl:'javascript:alert(1)'},{siteKey:''},{turnstileSiteKey:''}])assert.throws(()=>publicOptions({...valid,...bad}))
 assert.equal(validPrivacyUrl('https://example.com/privacy/'),true)
 for(const url of ['//other.example/privacy','data:text/html,x','https://user:pass@example.com/privacy/'])assert.equal(validPrivacyUrl(url),false)
})

test('email collection mode is explicit and defaults to required',()=>{
 assert.equal(publicOptions({}).emailMode,'required')
 for(const emailMode of ['required','optional','disabled'])assert.equal(publicOptions({emailMode}).emailMode,emailMode)
 for(const emailMode of ['anonymous',true,null])assert.throws(()=>publicOptions({emailMode}))
})
