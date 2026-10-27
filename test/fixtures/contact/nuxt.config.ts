import { defineNuxtConfig } from 'nuxt/config'
import contactSource from '../../../packages/nuxt-contact-form/src/module'
const contactForm = process.env.CONTACT_FORM_BUILT === '1' ? '../../../packages/nuxt-contact-form/dist/module.mjs' : contactSource
export default defineNuxtConfig({
 modules: [contactForm],
 compatibilityDate: '2026-10-26',
 telemetry: false,
 devtools: { enabled: false },
 contactForm: {
  mode: 'live', endpoint: 'https://api.example.com/v1/submissions',
  siteKey: 'fixture', turnstileSiteKey: 'test-only',
  policyVersion: 'urn:coela:legal:fixture:policy@' + 'a'.repeat(40), privacyUrl: '/privacy/'
 }
})
