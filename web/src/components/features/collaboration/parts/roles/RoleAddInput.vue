<template>
  <UInput
    v-model="name"
    :placeholder="t('collaboration.roles.namePlaceholder')"
    size="xl"
    variant="soft"
    class="w-full"
    :ui="{
      base: 'bg-tv-ui-bg-elevated',
    }"
    @keydown.enter="addRole"
  >
    <template #trailing>
      <UButton
        v-if="name.trim()"
        icon="i-lucide-corner-down-left"
        color="primary"
        variant="ghost"
        size="xs"
        :aria-label="t('collaboration.roles.create')"
        @click="addRole"
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
  loading?: boolean
}>()

const emit = defineEmits<{
  add: [name: string]
}>()

const { t } = useI18n()

const name = ref('')

function addRole() {
  const trimmed = name.value.trim()
  if (trimmed) {
    emit('add', trimmed)
    name.value = ''
  }
}
</script>
