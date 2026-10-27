# Design customization

A component's `ui`, `texts`, `unstyled`, `locale` and `headingTag` props configure presentation independently
of module-level endpoint/security configuration. The default implementation is
usable without any third-party design system. Multiple forms have unique IDs.

```vue
<NuxtContactForm
 :ui="{ root: 'my-contact', input: 'my-input', button: 'my-button' }"
 :texts="{ heading: 'Contact us', review: 'Review' }"
/>
```

CSS variables inherited by the root:
`--contact-accent`, `--contact-color`, `--contact-font`, `--contact-width`,
`--contact-radius`. `unstyled` disables default visual rules but preserves DOM,
labels, field lengths, hydration gate, review and transport behavior.

Parts: `root`, `heading`, `intro`, `form`, `fieldset`, `field`, `label`, `input`,
`textarea`, `hint`, `consent`, `review`, `actions`, `button`, `status`.
Text keys and slot props are exported as `ContactTexts`, `ContactUi`, `FieldSlot`,
`ConsentSlot` and `ActionSlot`; no HTML string injection is provided.

```vue
<NuxtContactForm unstyled>
 <template #email="{ modelValue, update, attrs }">
  <input v-bind="attrs" :value="modelValue"
   @input="update(($event.target as HTMLInputElement).value)">
 </template>
 <template #send-action="{ attrs, text }">
  <button v-bind="attrs" class="brand-button">{{ text }}</button>
 </template>
</NuxtContactForm>
```

Field slots: `email`, `subject`, `message`; consent slot exposes a boolean update
function, disabled state and safe privacy URL. `review` receives a frozen copy
of the reviewed values. Action slots are `review-action`, `back-action`,
`send-action`; `status` receives the current message in the live region.
Bind the supplied attributes; keep labels and accessibility when replacing
markup. The Turnstile container is not replaceable. Review and send actions guard
state even if a custom button ignores `disabled`. Sending uses the reviewed
snapshot, not mutable slot state. Custom slots are trusted site application code;
they can violate site privacy/accessibility and must be reviewed as such.
Server-side admission is mandatory regardless of client design or validation.

Use `locale="en"` for the built-in English labels (Japanese is the default).
Set `heading-tag="h2"` when the containing page already owns its h1. On localized
SPA navigation, key the component by locale to discard any unfinished input
and restart labels/state together; no input is persisted across pages.
