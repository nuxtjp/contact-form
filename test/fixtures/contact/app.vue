<script setup lang="ts">
import { useRoute } from '#imports'
import Custom from './custom.vue'
const customized = useRoute().query.design === 'custom'
</script>
<template><Custom v-if="customized" /><NuxtContactForm v-else /></template>
