<template>
  <TvListFilter v-model="listIds" />
  <TvUserFilter v-model="assigneeIds" />
  <UButton
    v-if="hasActiveFilters"
    icon="i-lucide-x"
    :label="showResetLabel ? t('filters.reset') : undefined"
    class="shrink-0"
    :class="{ '[&>span:last-child]:hidden lg:[&>span:last-child]:inline': showResetLabel }"
    variant="soft"
    color="error"
    size="sm"
    @click="resetFilters"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TvListFilter from './TvListFilter.vue'
import TvUserFilter from './TvUserFilter.vue'

const props = withDefaults(defineProps<{
  showResetLabel?: boolean
}>(), {
  showResetLabel: false,
})

const listIds = defineModel<number[]>('listIds', { default: () => [] })
const assigneeIds = defineModel<number[]>('assigneeIds', { default: () => [] })

const { t } = useI18n()

const hasActiveFilters = computed(() => listIds.value.length > 0 || assigneeIds.value.length > 0)

const resetFilters = () => {
  listIds.value = []
  assigneeIds.value = []
}

defineExpose({ hasActiveFilters })
</script>
