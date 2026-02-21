<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="font-semibold">
        {{ t('projects.edit') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('projects.name')">
          <UInput
            v-model="form.name"
            :placeholder="t('projects.namePlaceholder')"
            class="w-full"
            data-testid="project-edit-name"
          />
        </UFormField>
        <UFormField :label="t('projects.description')">
          <UTextarea
            v-model="form.description"
            :placeholder="t('projects.descriptionPlaceholder')"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="close"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          variant="outline"
          data-testid="project-edit-save"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Project } from '@/components/features/projects/types'

const props = defineProps<{
  project: Project | null
}>()

const isOpen = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  save: [data: { name: string; description: string }]
}>()

const { t } = useI18n()

const form = reactive({
  name: '',
  description: '',
})

watch(
  () => props.project,
  (project) => {
    if (project) {
      form.name = project.name
      form.description = project.description || ''
    }
  },
  { immediate: true },
)

function close() {
  isOpen.value = false
}

function save() {
  emit('save', { name: form.name, description: form.description })
  close()
}
</script>
