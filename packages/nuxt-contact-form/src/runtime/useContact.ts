import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { challenge } from './challenge'
import { sendContact } from './send'
import type { ModuleOptions } from './config'
import type { defaultTexts } from './design'

export function useContact(options: ModuleOptions, live: boolean, texts: typeof defaultTexts) {
 const fields = reactive({ email: '', subject: '', message: '', consent: false })
 const snapshot = reactive({ email: '', subject: '', message: '' })
 const confirming = ref(false), notice = ref(''), token = ref(''), busy = ref(false), locked = ref(false), ready = ref(false)
 const heading = ref<HTMLHeadingElement>(), challengeElement = ref<HTMLElement>()
 let dispose: (() => void) | undefined
 const valid = () => fields.consent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email) && fields.email.length <= 254 && fields.subject.trim().length > 0 && fields.subject.length <= 150 && fields.message.trim().length > 0 && fields.message.length <= 5000
 async function review() {
  if (!ready.value || busy.value || locked.value) return
  if (!valid()) { notice.value = texts.invalid; return }
  Object.assign(snapshot, { email: fields.email, subject: fields.subject, message: fields.message })
  confirming.value = true; notice.value = ''; await nextTick(); heading.value?.focus()
 }
 function back() { if (!busy.value && !locked.value) confirming.value = false }
 function finish() { notice.value = texts.finished }
 watch(confirming, async value => {
  token.value = ''; dispose?.(); dispose = undefined; await nextTick()
  if (value && live && challengeElement.value && !locked.value) dispose = challenge(challengeElement.value, options.turnstileSiteKey, value => { token.value = value })
 })
 onMounted(() => { ready.value = true })
 onBeforeUnmount(() => dispose?.())
 async function send() {
  if (!ready.value || !confirming.value || !live || busy.value || locked.value || !token.value || !fields.consent) return
  busy.value = true
  const result = await sendContact(options.endpoint, {siteKey: options.siteKey, ...snapshot, turnstileToken: token.value, submissionId: crypto.randomUUID(), policyVersion: options.policyVersion})
  dispose?.(); busy.value = false; locked.value = true; token.value = ''
  notice.value = result === 'accepted' ? texts.accepted : result === 'rejected' ? texts.rejected : texts.unknown
 }
 return { fields, snapshot, confirming, notice, token, busy, locked, ready, heading, challengeElement, review, back, send, finish }
}
