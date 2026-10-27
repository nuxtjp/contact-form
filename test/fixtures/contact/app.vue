<script setup lang="ts">
import { useRoute } from '#imports'
import Custom from './custom.vue'
const query = useRoute().query
const customized = query.design === 'custom'
const locale = query.locale === 'en' ? 'en' : 'ja'
const headingTag = query.heading === 'h2' ? 'h2' : 'h1'
</script>
<template><Custom v-if="customized" /><template v-else><h1 v-if="headingTag === 'h2'">Fixture page</h1><NuxtContactForm :locale="locale" :heading-tag="headingTag" /></template></template>
