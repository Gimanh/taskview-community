<template>
  <UButton
    variant="link"
    color="neutral"
    size="sm"
    :icon="copied ? 'i-lucide-check' : 'i-lucide-hash'"
    class="text-muted hover:text-default"
    :title="t('tasks.copyId')"
    data-testid="task-id-copy"
    @click="copyId"
  >
    {{ taskId }}
  </UButton>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  taskId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { copy, copied } = useClipboard({ copiedDuring: 2000 })

async function copyId() {
  await copy(`#${props.taskId}`)
  toast.add({
    title: t('tasks.idCopied'),
    color: 'success',
  })
}
</script>
