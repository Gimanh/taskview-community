<template>
  <ListsListBase
    v-model:open="open"
    :title="t('archive.title')"
    :lists="lists"
    :is-archive="true"
    @save="handleSave"
    @delete="handleDelete"
    @restore="handleRestore"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ListsListBase from '@/components/features/lists/parts/ListsListBase.vue'
import type { List } from '@/components/features/lists/types'

defineProps<{
  lists: List[]
}>()

const emit = defineEmits<{
  save: [list: List, data: { name: string }]
  delete: [list: List]
  restore: [list: List]
}>()

const { t } = useI18n()

const open = defineModel<boolean>('open', { required: false, default: false })

function handleSave(list: List, data: { name: string }) {
  emit('save', list, data)
}

function handleDelete(list: List) {
  emit('delete', list)
}

function handleRestore(list: List) {
  emit('restore', list)
}
</script>
