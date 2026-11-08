<template>
  <UButton
    icon="i-lucide-palette"
    color="neutral"
    variant="soft"
    size="sm"
    :title="t('projects.theme')"
    :aria-label="t('projects.theme')"
    :ui="{ base: 'rounded-lg' }"
    data-testid="project-theme-button"
    @click="isOpen = true"
  />
  <ProjectThemeModal
    v-model:open="isOpen"
    :project-id="projectId"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProjectThemeModal from './ProjectThemeModal.vue'

defineProps<{
  projectId: number
}>()

const { t } = useI18n()

const isOpen = ref(false)
</script>
