import type { NuxtModule } from '@nuxt/schema'
import { addComponent, createResolver, defineNuxtModule } from '@nuxt/kit'

import { defaultOptions, publicOptions, type ModuleOptions } from './runtime/config'
export type { ContactTexts, ContactUi, ContactPart, FieldSlot, ConsentSlot, ActionSlot } from './runtime/design'
export type { ModuleOptions } from './runtime/config'
const contactModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
 meta: { name: '@nuxtjp/contact-form', configKey: 'contactForm' },
 defaults: {...defaultOptions},
 setup(options, nuxt) {
  nuxt.options.appConfig.contactForm = publicOptions(options)
  const resolver = createResolver(import.meta.url)
  addComponent({name: 'NuxtContactForm', filePath: resolver.resolve('./runtime/NuxtContactForm.vue')})
 }
})

export default contactModule

declare module '@nuxt/schema' {
 interface NuxtConfig { contactForm?: Partial<ModuleOptions> }
 interface NuxtOptions { contactForm: ModuleOptions }
}
