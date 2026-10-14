<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :title="t('files.rename.title')"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <UFormField :label="t('files.rename.label')">
        <UInput
          v-model="name"
          class="w-full"
          autofocus
          data-testid="file-rename-input"
          @keydown.enter.prevent="submit"
        />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          :label="t('files.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="t('files.rename.submit')"
          :disabled="!name.trim()"
          data-testid="file-rename-submit"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TvFile } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'

const file = defineModel<TvFile | null>('file', { default: null })

const emit = defineEmits<{
  submit: [name: string]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const name = ref('')
const open = computed({
  get: () => file.value !== null,
  set: (value: boolean) => {
    if (!value) file.value = null
  },
})

watch(file, (current) => {
  name.value = current?.name ?? ''
})

function submit() {
  if (!name.value.trim()) return
  emit('submit', name.value.trim())
}
</script>
