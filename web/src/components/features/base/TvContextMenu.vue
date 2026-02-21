<template>
  <UPopover
    v-model:open="isOpen"
    :content="{ side: 'bottom', align: 'start', updatePositionStrategy: 'always' }"
  >
    <template #default>
      <div
        class="fixed pointer-events-none"
        :style="anchorStyle"
      />
    </template>
    <template #content>
      <slot />
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const isOpen = defineModel<boolean>('open', { default: false })

const anchorPosition = ref({ x: 0, y: 0 })

const anchorStyle = computed(() => ({
  left: `${anchorPosition.value.x}px`,
  top: `${anchorPosition.value.y}px`,
  width: '1px',
  height: '1px',
}))

function onScroll() {
  if (isOpen.value) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, true)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll, true)
})

function openAt(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  anchorPosition.value = {
    x: rect.right,
    y: rect.bottom,
  }
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

defineExpose({
  openAt,
  close,
})
</script>
