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
  const calls={limit:0,verify:0,token:0,email:[]}
  const site={siteKey:'hat-corporate',origin:'https://hat-tech.co.jp',to:'contact@hat-tech.co.jp',policyVersion,enabled:mode!=='disabled',network:{allowedCidrs:[],deniedCidrs:mode==='denied'?['203.0.113.0/24']:[],allowedCountries:[],deniedCountries:[],deniedRegions:[],deniedAsns:[]}}
  if (mode === 'email-optional') site.emailMode = 'optional'
  if (mode === 'email-disabled') site.emailMode = 'disabled'
  if (mode.startsWith('widget-')) site.turnstileSecretBinding = 'TURNSTILE_SECRET_EXTENDED'
  const network=site.network;delete site.network
  const second={siteKey:'coela',origin:'https://coela.org',to:'contact@coela.org',enabled:mode!=='coela-disabled',policyVersion}
  const config={...env,CONTACT_ACCEPTING:mode==='all-disabled'?'false':'true',CONTACT_SITES_JSON:mode==='config'?'{}':JSON.stringify([site,second]),CONTACT_NETWORK_JSON:mode==='global-denied'?JSON.stringify({deniedCidrs:['203.0.113.0/24']}):'{}',CONTACT_SITE_NETWORKS_JSON:JSON.stringify({'hat-corporate':mode==='global-denied'?{allowedCidrs:['203.0.113.9/32']}:network}),TURNSTILE_SECRET:'synthetic',IP_KEY_SECRET:'s'.repeat(32),LIMITER:new Ratelimit(mode,calls),GRAPH_TENANT_ID:'aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb',GRAPH_CLIENT_ID:'cccccccc-1111-2222-3333-dddddddddddd',GRAPH_SENDER_MAILBOX_ID:'eeeeeeee-1111-2222-3333-ffffffffffff',GRAPH_CLIENT_SECRET:'synthetic+&= secret'}
  if(mode==='vars-object')config.CONTACT_NETWORK_JSON={deniedCidrs:['203.0.113.0/24']}
  if(mode==='missing-flag')delete config.CONTACT_ACCEPTING
  if(mode==='missing')delete config.GRAPH_CLIENT_SECRET
  if(mode==='bad-graph-identity')config.GRAPH_TENANT_ID='common'
  if(mode==='bad-graph-secret')config.GRAPH_CLIENT_SECRET='bad\r\nsecret'
  if(mode==='missing-secret')delete config.TURNSTILE_SECRET
  if(mode.startsWith('widget-') && mode!=='widget-missing')config.TURNSTILE_SECRET_EXTENDED='synthetic-extended'
  if(mode==='widget-without-default')delete config.TURNSTILE_SECRET
  const headers=new Headers(request.headers);headers.set('cf-connecting-ip',mode==='no-ip'?'':'203.0.113.9')
  const incoming=new Request(request,{headers,cf:{country:'JP',regionCode:'13',asn:64500}})
  if(mode==='no-cf')Object.defineProperty(incoming,'cf',{value:undefined})
  globalThis.fetch=async(url,options)=>{
   const outbound=url instanceof Request?url:new Request(url,options)
   if(outbound.redirect!=='manual'||outbound.method!=='POST')throw Error('outbound request must be POST without redirects')
   if(outbound.url==='https://login.microsoftonline.com/aaaaaaaa-1111-2222-3333-bbbbbbbbbbbb/oauth2/v2.0/token'){
    calls.token++
    const fields=await outbound.formData()
    if([...fields.keys()].sort().join(',')!=='client_id,client_secret,grant_type,scope'||fields.get('client_id')!==config.GRAPH_CLIENT_ID||fields.get('client_secret')!==config.GRAPH_CLIENT_SECRET||fields.get('scope')!=='https://graph.microsoft.com/.default'||fields.get('grant_type')!=='client_credentials'||outbound.headers.has('authorization'))throw Error('invalid OAuth confinement')
    if(mode==='token-error')return Response.json({private:'must not leak'},{status:401})
    if(mode==='token-redirect')return new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}})
    if(mode==='token-huge')return new Response('x'.repeat(16385))
    return Response.json({access_token:mode==='token-invalid'?'bad\r\nvalue':'fixture-access-token',token_type:'Bearer',expires_in:3600})
   }
   if(outbound.url==='https://graph.microsoft.com/v1.0/users/eeeeeeee-1111-2222-3333-ffffffffffff/sendMail'){
    if(outbound.headers.get('authorization')!=='Bearer fixture-access-token')throw Error('Graph access token missing or credential leaked')
    const body=await outbound.json(),m=body.message
    if(body.saveToSentItems!==false||m.body.contentType!=='Text'||m.toRecipients.length!==1||m.from||m.sender||m.ccRecipients||m.bccRecipients||m.attachments)throw Error('unscoped Graph mail')
    calls.email.push({to:m.toRecipients[0].emailAddress.address,replyTo:m.replyTo?.[0]?.emailAddress?.address,subject:m.subject,text:m.body.content})
    if(mode==='unknown')throw Error('synthetic delivery error')
    if(mode==='graph-redirect')return new Response(null,{status:302,headers:{location:'https://must-not-follow.invalid/'}})
    if(mode==='graph-reject')return Response.json({private:'must not leak'},{status:403})
    return new Response(null,{status:202})
   }
   if(outbound.url!=='https://challenges.cloudflare.com/turnstile/v0/siteverify')throw Error('unexpected network')
   calls.verify++;const input=url instanceof Request ? await url.json() : JSON.parse(await new Response(options.body).text())
   if(Object.keys(input).sort().join(',')!=='response,secret')throw Error('private data sent to verifier')
   if(input.secret!==(mode.startsWith('widget-')?'synthetic-extended':'synthetic'))throw Error('wrong site widget secret')
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
