<template>
  <UButton
    v-bind="appearance"
    :icon="copied ? 'i-lucide-check' : 'i-lucide-hash'"
    :title="t('tasks.copyId')"
    data-testid="task-id-copy"
    @click="copyId"
  >
    {{ taskId }}
  </UButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  taskId: number
  badge?: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const { copy, copied } = useClipboard({ copiedDuring: 2000 })

const appearance = computed(() =>
  props.badge
    ? {
      variant: 'subtle' as const,
      color: 'neutral' as const,
      size: 'xs' as const,
      class: 'bg-elevated text-muted hover:text-default rounded-md',
      ui: { leadingIcon: 'size-3' },
    }
    : {
      variant: 'link' as const,
      color: 'neutral' as const,
      size: 'sm' as const,
      class: 'text-muted hover:text-default',
    },
)

async function copyId() {
  await copy(`#${props.taskId}`)
  toast.add({
    title: t('tasks.idCopied'),
    color: 'success',
  })
}
</script>
