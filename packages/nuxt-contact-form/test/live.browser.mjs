import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
try{
 for(const mode of ['accepted','blocked','unknown','expired']){
  const context=await browser.newContext()
  await context.addInitScript(()=>{window.turnstile={render(_el,options){window.expireContact=options['expired-callback'];options.callback('test-token');return 'test-widget'},remove(){}}})
  let sends=0
  await context.route('https://api.example.com/v1/submissions',async route=>{
   const request=route.request();if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}});return}
   sends++;assert.equal(request.method(),'POST');assert.equal(request.url().includes('person@example'),false)
   assert.deepEqual(Object.keys(request.postDataJSON()).sort(),['email','message','policyVersion','siteKey','subject','submissionId','turnstileToken'])
   await route.fulfill({status:mode==='accepted'?202:mode==='blocked'?403:503,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:JSON.stringify({code:mode==='accepted'?'accepted_by_provider':mode==='blocked'?'submission_unavailable':'outcome_unknown_do_not_resend'})})
  })
  const page=await context.newPage();await page.goto('http://127.0.0.1:3418/',{waitUntil:'networkidle'})
  await page.getByLabel('メールアドレス').fill('person@example.com');await page.getByLabel('件名').fill('Test');await page.getByLabel('お問い合わせ内容 必須').fill('Test');await page.getByRole('checkbox').check()
  await page.getByRole('button',{name:'入力内容を確認する'}).click()
  const button=page.getByRole('button',{name:'送信する',exact:true});await button.waitFor()
  if(mode==='expired'){await page.evaluate(()=>window.expireContact());assert.equal(await button.isDisabled(),true);assert.equal(sends,0)}
  else{
   await button.click();await page.getByRole('status').filter({hasText:mode==='accepted'?'配送サービスが受け付けました':mode==='blocked'?'送信は許可されませんでした':'結果を確認できませんでした'}).waitFor()
   assert.equal(await button.isDisabled(),true);await button.evaluate(el=>el.click());assert.equal(sends,1)
  }
  console.log('Passed live UI:',mode);await context.close()
 }
}finally{await browser.close()}
