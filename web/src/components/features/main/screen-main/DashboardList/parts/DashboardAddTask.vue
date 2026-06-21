<template>
  <MainScreenAddTaskDialog
    v-model="open"
    :title="title"
    :disabled="disabled"
    :upcoming-task="upcomingTask"
    :no-dates="noDates"
  >
    <template #activator="props">
      <UButton
        v-if="compact"
        v-bind="props"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        size="sm"
        :disabled="disabled"
        :ui="{ base: 'rounded-full hover:bg-primary/10 hover:text-primary' }"
        @click.stop
      />
      <button
        v-else
        v-bind="props"
        type="button"
        :disabled="disabled"
        class="flex items-center gap-2.5 w-full px-4 py-3 rounded-2xl border border-dashed border-default text-muted hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span class="flex items-center justify-center size-6 rounded-full border border-dashed border-current shrink-0">
          <UIcon
            name="i-lucide-plus"
            class="size-3.5"
          />
        </span>
        <span class="text-[15px]">{{ t('msg.addTask') }}</span>
      </button>
    </template>
  </MainScreenAddTaskDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MainScreenAddTaskDialog from '@/components/features/main/screen-main/parts/MainScreenAddTaskDialog.vue'

defineProps<{
  title: string
  disabled?: boolean
  upcomingTask?: boolean
  noDates?: boolean
  compact?: boolean
}>()

const { t } = useI18n()
const open = ref(false)
</script>
