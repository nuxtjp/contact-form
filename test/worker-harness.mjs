// Test-only edge adapter. Never referenced by wrangler.jsonc or deployed.
import handler from '../build/index.js'
export {ContactReceipts} from '../build/index.js'
const policyVersion='urn:coela:legal:organization:hat-inc:privacy-policy@'+'a'.repeat(40)
const originalFetch=globalThis.fetch
class Ratelimit {
 constructor(mode,calls){this.mode=mode;this.calls=calls}
 async limit({key}){this.calls.limit++;if(key.includes('203.0.113'))throw Error('raw IP leaked');return {success:this.mode!=='rate'}}
}
export default {
 async fetch(request,env,ctx){
  const mode=request.headers.get('x-test-mode')||'normal'
  const calls={limit:0,verify:0,email:[]}
  const site={siteKey:'hat-corporate',origin:'https://hat-tech.co.jp',to:'contact@hat-tech.co.jp',policyVersion,enabled:mode!=='disabled',network:{allowedCidrs:[],deniedCidrs:mode==='denied'?['203.0.113.0/24']:[],allowedCountries:[],deniedCountries:[],deniedRegions:[],deniedAsns:[]}}
  if (mode === 'email-optional') site.emailMode = 'optional'
  if (mode === 'email-disabled') site.emailMode = 'disabled'
  const network=site.network;delete site.network
  const second={siteKey:'coela',origin:'https://coela.org',to:'contact@coela.org',enabled:mode!=='coela-disabled',policyVersion}
  const config={...env,CONTACT_ACCEPTING:mode==='all-disabled'?'false':'true',CONTACT_SITES_JSON:mode==='config'?'{}':JSON.stringify([site,second]),CONTACT_MAIL_FROM:'forms@notify.example.com',CONTACT_NETWORK_JSON:mode==='global-denied'?JSON.stringify({deniedCidrs:['203.0.113.0/24']}):'{}',CONTACT_SITE_NETWORKS_JSON:JSON.stringify({'hat-corporate':mode==='global-denied'?{allowedCidrs:['203.0.113.9/32']}:network}),TURNSTILE_SECRET:'synthetic',IP_KEY_SECRET:'s'.repeat(32),LIMITER:new Ratelimit(mode,calls),EMAIL:{async send(v){calls.email.push(v);if(mode==='unknown')throw Error('synthetic delivery error');return {messageId:'test-id'}}}}
  if(mode==='vars-object')config.CONTACT_NETWORK_JSON={deniedCidrs:['203.0.113.0/24']}
  if(mode==='missing-flag')delete config.CONTACT_ACCEPTING
  if(mode==='missing')delete config.EMAIL
  if(mode==='missing-secret')delete config.TURNSTILE_SECRET
  const headers=new Headers(request.headers);headers.set('cf-connecting-ip',mode==='no-ip'?'':'203.0.113.9')
  const incoming=new Request(request,{headers,cf:{country:'JP',regionCode:'13',asn:64500}})
  if(mode==='no-cf')Object.defineProperty(incoming,'cf',{value:undefined})
  globalThis.fetch=async(url,options)=>{
   if((url instanceof Request ? url.url : String(url))!=='https://challenges.cloudflare.com/turnstile/v0/siteverify')throw Error('unexpected network')
   calls.verify++;const input=url instanceof Request ? await url.json() : JSON.parse(await new Response(options.body).text())
   if(Object.keys(input).sort().join(',')!=='response,secret')throw Error('private data sent to verifier')
   if(mode==='redirect')return new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}})
   if(mode==='huge-verification')return new Response('x'.repeat(8193))
   if(url instanceof Request && url.redirect!=='manual')throw Error('verification must not follow redirects')
   return Response.json({success:mode!=='failed',hostname:mode==='hostname'?'other.example':new URL(request.headers.get('origin')||site.origin).hostname,action:mode==='action'?'other':'contact',challenge_ts:mode==='expired'?new Date(Date.now()-301000).toISOString():new Date().toISOString()})
  }
  try{
   if(new URL(request.url).pathname==='/test-reservation'){
    const stub=env.RECEIPTS_NAMESPACE.get(env.RECEIPTS_NAMESPACE.idFromName('concurrent-fixture'))
    return stub.fetch('https://receipt.internal/reserve',{method:'POST'})
   }
   const response=await new handler(ctx,config).fetch(incoming)
   const body=await response.json()
   return Response.json({...body,calls},{status:response.status,headers:response.headers})
  }finally{globalThis.fetch=originalFetch}
 }
}
