<script setup lang="ts">
const custom = true
</script>
<template>
 <NuxtContactForm :unstyled="custom" :ui="{ root: 'custom-root', heading: 'custom-heading' }" :texts="{ heading: 'Custom contact', review: 'Review custom' }" style="--contact-accent: rgb(255, 0, 0)">
  <template #email="{ modelValue, update, attrs }"><input v-bind="attrs" data-custom-email :value="modelValue" @input="update(($event.target as HTMLInputElement).value)"></template>
  <template #review-action="{ attrs, text }"><button v-bind="attrs" data-custom-review>{{ text }}</button></template>
  <template #send-action="{ attrs, text }"><button v-bind="attrs" data-custom-send>{{ text }}</button></template>
 </NuxtContactForm>
</template>
