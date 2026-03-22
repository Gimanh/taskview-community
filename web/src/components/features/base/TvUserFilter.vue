<template>
  <USelectMenu
    v-model="selected"
    :items="options"
    multiple
    value-key="value"
    :placeholder="t('filters.allUsers')"
    :search-input="false"
    size="sm"
    variant="subtle"
    class="min-w-40 max-w-56 shrink-0 [&>button]:truncate"
  >
    <template #leading>
      <UIcon
        :name="model.length === 0 ? 'i-lucide-users' : 'i-lucide-user'"
        class="size-4"
      />
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCollaborationStore } from '@/stores/collaboration.store'

const ALL_VALUE = -1

const model = defineModel<number[]>({ default: () => [] })

const { t } = useI18n()
const collaborationStore = useCollaborationStore()

const options = computed(() => [
  { label: t('filters.allUsers'), value: ALL_VALUE },
  ...collaborationStore.users.map((user) => ({
    label: user.email,
    value: user.id,
  })),
])

const hadAll = computed(() => model.value.length === 0)

const selected = computed({
  get() {
    return model.value.length === 0 ? [ALL_VALUE] : model.value
  },
  set(val: number[]) {
    const allJustSelected = val.includes(ALL_VALUE) && !hadAll.value
    if (allJustSelected || val.length === 0) {
      model.value = []
    } else {
      model.value = val.filter((v) => v !== ALL_VALUE)
    }
  },
})
</script>
