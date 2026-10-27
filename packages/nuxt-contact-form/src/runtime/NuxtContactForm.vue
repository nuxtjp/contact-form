<script setup lang="ts">
import { computed, useId } from 'vue'
import { useAppConfig } from '#imports'
import { defaultOptions, validPrivacyUrl, type ModuleOptions } from './config'
import { defaultTexts, englishTexts, type ContactTexts, type ContactUi, type FieldSlot, type ConsentSlot, type ActionSlot } from './design'
import { useContact } from './useContact'
const props = withDefaults(defineProps<{ privacyUrl?: string; locale?: 'ja' | 'en'; headingTag?: 'h1' | 'h2'; ui?: ContactUi; texts?: ContactTexts; unstyled?: boolean }>(), { privacyUrl: '', locale: 'ja', headingTag: 'h1', unstyled: false })
defineSlots<{
 email(props: FieldSlot): unknown; subject(props: FieldSlot): unknown; message(props: FieldSlot): unknown
 consent(props: ConsentSlot): unknown; review(props: { fields: Readonly<{ email: string; subject: string; message: string }> }): unknown
 'review-action'(props: ActionSlot): unknown; 'back-action'(props: ActionSlot): unknown; 'send-action'(props: ActionSlot): unknown
 status(props: { message: string }): unknown
}>()
const options = { ...defaultOptions, ...useAppConfig().contactForm as Partial<ModuleOptions> }
const privacyUrl = validPrivacyUrl(props.privacyUrl || options.privacyUrl) ? props.privacyUrl || options.privacyUrl : ''
const live = options.mode === 'live' && Boolean(privacyUrl)
const texts = computed(() => ({ ...(props.locale === 'en' ? englishTexts : defaultTexts), ...props.texts }))
const { fields, snapshot, confirming, notice, token, busy, locked, ready, heading, challengeElement, review, back, send, finish } = useContact(options, live, texts.value)
const visibleFields = options.emailMode === 'disabled' ? ['subject', 'message'] as const : ['email', 'subject', 'message'] as const
const id = useId()
function attrs(field: 'email' | 'subject' | 'message') {
 return { id: `${id}-${field}`, disabled: !ready.value || busy.value || locked.value, required: field !== 'email' || options.emailMode === 'required', maxlength: field === 'email' ? 254 : field === 'subject' ? 150 : 5000, ...(field === 'email' ? { type: 'email', autocomplete: 'email' } : {}), 'aria-describedby': `${id}-${field}-hint` }
}
</script>

<template>
 <section :class="['contact-preview', { 'contact-styled': !unstyled }, ui?.root]" :aria-labelledby="`${id}-heading`">
  <p v-if="!live" class="preview-label">{{ texts.preview }}</p>
  <component :is="headingTag" :id="`${id}-heading`" ref="heading" tabindex="-1" :class="ui?.heading">{{ confirming ? texts.reviewHeading : texts.heading }}</component>
  <p :class="['intro', ui?.intro]">{{ confirming ? (live ? texts.reviewIntro : texts.previewIntro) : texts.intro }}</p>
  <form v-if="!confirming" method="dialog" :class="ui?.form" @submit.prevent="review">
   <noscript><p>{{ texts.noScript }}</p></noscript>
   <fieldset :disabled="!ready" :class="ui?.fieldset">
    <div v-for="field in visibleFields" :key="field" :class="ui?.field">
     <label :for="`${id}-${field}`" :class="ui?.label">{{ texts[field] }} <span>{{ field === 'email' && options.emailMode === 'optional' ? texts.optional : texts.required }}</span></label>
     <slot :name="field" :model-value="fields[field]" :update="(value: string) => fields[field] = value" :attrs="attrs(field)">
      <textarea v-if="field === 'message'" v-bind="attrs(field)" v-model="fields[field]" rows="6" :class="ui?.textarea" />
      <input v-else v-bind="attrs(field)" v-model="fields[field]" :class="ui?.input">
     </slot>
     <small :id="`${id}-${field}-hint`" :class="ui?.hint">{{ field === 'email' ? (options.emailMode === 'optional' ? texts.optionalEmailHint : texts.emailHint) : field === 'message' ? texts.messageHint : '' }}</small>
    </div>
    <slot name="consent" :model-value="fields.consent" :update="(value: boolean) => fields.consent = value" :disabled="!ready" :privacy-url="privacyUrl" :text="texts.privacy + texts.acknowledged">
     <label :class="['consent', ui?.consent]"><input v-model="fields.consent" type="checkbox" required><span class="consent-text"><template v-if="privacyUrl"><a :href="privacyUrl">{{ texts.privacy }}</a>{{ texts.acknowledged }}</template><template v-else>{{ texts.previewPrivacy }}</template></span></label>
    </slot>
    <p v-if="!privacyUrl" class="policy-note">{{ texts.policyNote }}</p>
    <slot name="review-action" :attrs="{ type: 'submit', disabled: !ready || busy || locked }" :text="texts.review">
     <button type="submit" :class="ui?.button">{{ texts.review }} <span aria-hidden="true">→</span></button>
    </slot>
   </fieldset>
  </form>
  <div v-else :class="ui?.review">
   <slot name="review" :fields="Object.freeze({ ...snapshot })">
    <dl><template v-for="field in visibleFields" :key="field"><dt>{{ texts[field] }}</dt><dd>{{ snapshot[field] || texts.notProvided }}</dd></template></dl>
   </slot>
   <div v-if="live" ref="challengeElement" :aria-label="texts.challenge" />
   <div :class="['actions', ui?.actions]">
    <slot name="back-action" :attrs="{ type: 'button', disabled: busy || locked, onClick: back }" :text="texts.back"><button type="button" :class="['secondary', ui?.button]" :disabled="busy || locked" @click="back">{{ texts.back }}</button></slot>
    <button v-if="!live" type="button" :class="ui?.button" @click="finish">{{ texts.finish }}</button>
    <slot v-else name="send-action" :attrs="{ type: 'button', disabled: busy || locked || !token, onClick: send }" :text="busy ? texts.sending : texts.send"><button type="button" :class="ui?.button" :disabled="busy || locked || !token" @click="send">{{ busy ? texts.sending : texts.send }}</button></slot>
   </div>
  </div>
  <p role="status" :class="ui?.status"><slot name="status" :message="notice">{{ notice }}</slot></p>
 </section>
</template>
<style scoped src="./contact.css"></style>
