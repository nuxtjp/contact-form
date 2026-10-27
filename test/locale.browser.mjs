import {chromium} from '@playwright/test'
import assert from 'node:assert/strict'
const browser=await chromium.launch({headless:true})
try {
 const context=await browser.newContext()
 let scripts=0
 await context.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',route=>{
  scripts++
  return route.fulfill({contentType:'text/javascript',body:'window.contactRemoved=0;window.turnstile={render(el,o){o.callback("fixture-token");return "fixture-widget"},remove(){window.contactRemoved++}}'})
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:3418/?locale=en&heading=h2',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Contact',level:2}).waitFor()
 assert.equal(await page.locator('h1').count(),1)
 assert.equal(scripts,0)
 await page.getByLabel('Email address Required').fill('person@example.com')
 await page.getByLabel('Subject Required').fill('Test')
 await page.getByLabel('Message Required').fill('Synthetic report')
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Review message'}).click()
 await page.getByRole('heading',{name:'Review your message',level:2}).waitFor()
 await page.waitForFunction(()=>Boolean(window.turnstile))
 assert.equal(scripts,1)
 await page.getByRole('button',{name:'Edit message'}).click()
 assert.equal(await page.evaluate(()=>window.contactRemoved),1)
 console.log('Passed English UI, containing-page heading, delayed Turnstile load and widget cleanup.')
 await context.close()
} finally { await browser.close() }
