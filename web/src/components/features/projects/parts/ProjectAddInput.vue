<template>
  <div class="shadow-sm rounded-lg">
    <UInput
      v-model="projectName"
      :placeholder="t('projects.addPlaceholder')"
      size="xl"
      variant="soft"
      class="w-full"
      data-testid="project-add-input"
      :ui="{
        base: 'bg-tv-ui-bg-elevated',
      }"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

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
