<template>
    <UInput
      v-model="projectName"
      :placeholder="placeholder ?? t('projects.addPlaceholder')"
      size="xl"
      variant="soft"
      class="w-full"
      data-testid="project-add-input"
     
      @keydown.enter="addProject"
    >
      <template #trailing>
        <UButton
          v-if="projectName.trim()"
          icon="i-lucide-corner-down-left"
          color="primary"
          variant="ghost"
          size="xs"
          :aria-label="t('projects.add')"
          @click="addProject"
        />
        <UIcon
          v-else
          name="i-lucide-keyboard"
          class="size-4 text-dimmed"
        />
      </template>
    </UInput>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  placeholder?: string
}>()

const emit = defineEmits<{
  add: [name: string]
}>()

const { t } = useI18n()

const projectName = ref('')

function addProject() {
  const name = projectName.value.trim()
  if (name) {
    emit('add', name)
    projectName.value = ''
  }
}
</script>
