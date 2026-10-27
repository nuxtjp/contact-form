/** Browser transport: no credentials, redirects, persistence or automatic retry.
 * @param {string} endpoint @param {Record<string,string>} payload @param {typeof fetch} [transport]
 * @returns {Promise<'accepted'|'rejected'|'unknown'>} */
export async function sendContact(endpoint: string, payload: Record<string, string>, transport: typeof fetch = fetch): Promise<'accepted' | 'rejected' | 'unknown'> {
 try{
  const url=new URL(endpoint)
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/v1/submissions')return 'rejected'
  const res=await transport(url.href,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)})
  if(!res.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return 'unknown'
  const reader=res.body?.getReader();if(!reader)return 'unknown'
  let text='';let bytes=0;const decoder=new TextDecoder('utf-8',{fatal:true})
  try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096)return 'unknown';text+=decoder.decode(value,{stream:true})}text+=decoder.decode()}
  finally{void reader.cancel().catch(()=>{});reader.releaseLock()}
  const result=JSON.parse(text)
  if(res.status===202&&result.code==='accepted_by_provider')return 'accepted'
  if([400,403,405,413,415,429].includes(res.status)&&['invalid_submission','submission_unavailable','verification_failed','method_not_allowed','unsupported_media_type','rate_limited'].includes(result.code))return 'rejected'
  return 'unknown'
 }catch{return 'unknown'}
}
