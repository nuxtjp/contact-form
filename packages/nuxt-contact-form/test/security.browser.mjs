import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const origin=process.env.CONTACT_PREVIEW_URL || 'http://127.0.0.1:3417'
const browser=await chromium.launch({headless:true})
try {
 for(const mode of ['no-js','failed-hydration','normal']){
  const context=await browser.newContext({javaScriptEnabled:mode!=='no-js'})
  if(mode==='failed-hydration')await context.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue())
  const page=await context.newPage();let sent=false
  page.on('request',r=>{if(r.method()==='POST'||r.url().includes('private-marker'))sent=true})
  await page.goto(origin+'/contact',{waitUntil:'networkidle'})
  assert.equal(await page.locator('form').getAttribute('method'),'dialog')
  assert.equal(await page.locator('form [name]').count(),0)
  assert.equal(await page.locator('form input:not([type=checkbox])').count(),2)
  if(mode==='normal'){
   await page.getByLabel('メールアドレス').fill('private-marker@example.com')
   await page.getByLabel('件名').fill('private-marker')
   await page.getByLabel('お問い合わせ内容 必須').fill('<img src=x onerror="window.contactInjected=true">')
   await page.getByRole('checkbox').check()
   await page.getByRole('button',{name:'入力内容を確認する'}).click()
   await page.getByRole('heading',{name:'入力内容の確認'}).waitFor()
   assert.equal(await page.locator('.contact-preview img').count(),0)
   assert.equal(await page.evaluate(()=>window.contactInjected),undefined)
   await page.getByRole('button',{name:'入力に戻る'}).click()
   assert.equal(await page.getByLabel('メールアドレス').inputValue(),'private-marker@example.com')
  }else{
   assert.equal(await page.getByRole('button',{name:'入力内容を確認する'}).isDisabled(),true)
   // Even if a tool forcibly enables controls, native form fallback remains inert.
   await page.locator('fieldset').evaluate(el=>{el.disabled=false; for(const control of el.querySelectorAll('[disabled]'))control.disabled=false})
   await page.getByLabel('メールアドレス').fill('private-marker@example.com')
   await page.getByLabel('件名').fill('private-marker')
   await page.getByLabel('お問い合わせ内容 必須').fill('private-marker')
   await page.getByRole('checkbox').check()
   await page.getByRole('button',{name:'入力内容を確認する'}).click()
   assert.equal(new URL(page.url()).search,'')
  }
  assert.equal(sent,false,mode+' must not send form content')
  console.log('Passed:',mode)
  await context.close()
 }
}finally{await browser.close()}
