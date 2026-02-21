<template>
  <UInput
    v-model="listName"
    :placeholder="t('lists.addPlaceholder')"
    size="xl"
    variant="soft"
    class="w-full"
    :ui="{
      base: 'bg-tv-ui-bg-elevated',
    }"
    @keydown.enter="addList"
  >
    <template #trailing>
      <UButton
        v-if="listName.trim()"
        icon="i-lucide-corner-down-left"
        color="primary"
        variant="ghost"
        size="xs"
        :aria-label="t('lists.add')"
        @click="addList"
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

const emit = defineEmits<{
  add: [name: string]
}>()

const { t } = useI18n()

const listName = ref('')

function addList() {
  const name = listName.value.trim()
  if (name) {
    emit('add', name)
    listName.value = ''
  }
}
</script>
