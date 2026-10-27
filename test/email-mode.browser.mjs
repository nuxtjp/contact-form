import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const mode=process.env.CONTACT_TEST_EMAIL_MODE
assert.ok(['optional','disabled'].includes(mode))
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
 const page=await context.newPage();await page.goto('http://127.0.0.1:3418/',{waitUntil:'networkidle'})
 const email=page.getByLabel('メールアドレス')
 if(mode==='disabled')assert.equal(await email.count(),0)
 else {assert.equal(await email.getAttribute('required'),null);assert.ok(await page.getByText('返信を希望する場合だけご入力ください。未入力でも情報提供できます。').isVisible())}
 await page.getByLabel('件名').fill('Information');await page.getByLabel('お問い合わせ内容 必須').fill('Synthetic report');await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'入力内容を確認する'}).click()
 await page.getByRole('heading',{name:'入力内容の確認'}).waitFor()
 if(mode==='disabled')assert.equal(await page.getByText('メールアドレス',{exact:true}).count(),0)
 else assert.ok(await page.getByText('未入力（返信できません）',{exact:true}).isVisible())
 await page.getByRole('button',{name:'送信する',exact:true}).click()
 await page.getByRole('status').filter({hasText:'配送サービスが受け付けました'}).waitFor()
 assert.equal(Object.hasOwn(sent,'email'),false)
 console.log('Passed address-free built-module browser submission:',mode)
 await context.close()
}finally{await browser.close()}
