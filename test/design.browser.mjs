import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
try {
 const context=await browser.newContext()
 await context.addInitScript(()=>{window.turnstile={render(_el,o){o.callback('test-token');return 'widget'},remove(){}}})
 let sent
 await context.route('https://api.example.com/v1/submissions',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST','access-control-allow-headers':'content-type'}})
  sent=route.request().postDataJSON()
  return route.fulfill({status:202,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify({code:'accepted_by_provider'})})
 })
 const page=await context.newPage();await page.goto('http://127.0.0.1:3418/?design=custom',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Custom contact'}).waitFor()
 assert.equal(await page.locator('.custom-heading').count(),1);assert.equal(await page.locator('.contact-styled').count(),0)
 assert.notEqual(await page.locator('[data-custom-review]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 87, 164)')
 await page.locator('[data-custom-email]').fill('person@example.com');await page.getByLabel('件名').fill('Reviewed');await page.getByLabel('お問い合わせ内容 必須').fill('Original message');await page.getByRole('checkbox').check()
 await page.locator('[data-custom-review]').click();await page.getByRole('heading',{name:'入力内容の確認'}).waitFor()
 await page.locator('[data-custom-send]').click();await page.getByRole('status').filter({hasText:'配送サービスが受け付けました'}).waitFor()
 assert.equal(sent.subject,'Reviewed');assert.equal(sent.message,'Original message');assert.equal(sent.email,'person@example.com')
 assert.equal(await page.locator('[data-custom-send]').isDisabled(),true)
 console.log('Passed typed custom field/action slots, text/classes, unstyled mode and guarded sending.')
 await context.close()
}finally{await browser.close()}
