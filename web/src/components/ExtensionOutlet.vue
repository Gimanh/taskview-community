<template>
  <component
    :is="component"
    v-for="(component, index) in components"
    :key="`${name}-${index}`"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getOutletComponents } from '@/extensions/registry'

const props = defineProps<{ name: string }>()

const components = computed(() => getOutletComponents(props.name))
</script>