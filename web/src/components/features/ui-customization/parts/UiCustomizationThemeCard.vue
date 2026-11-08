<template>
  <button
    type="button"
    class="group flex flex-col gap-2 rounded-2xl p-1.5 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
    :class="active ? 'bg-elevated ring-2 ring-primary' : 'hover:bg-elevated/60'"
    :style="vars"
    :aria-pressed="active"
    :data-testid="testId"
    @click="emit('select')"
  >
    <span
      class="flex aspect-[16/10] w-full overflow-hidden rounded-xl border border-(--pv-border) bg-(--pv-surface) dark:border-(--pv-border-dark) dark:bg-(--pv-surface-dark)"
      aria-hidden="true"
    >
      <span class="flex w-[34%] flex-col gap-1.5 bg-(--pv-sidebar) p-2 dark:bg-(--pv-sidebar-dark)">
        <span class="h-1.5 w-3/4 rounded-full bg-(--pv-line) dark:bg-(--pv-line-dark)" />
        <span class="flex h-3 items-center rounded-md bg-(--pv-accent-soft) px-1 dark:bg-(--pv-accent-soft-dark)">
          <span class="h-1 w-2/3 rounded-full bg-(--pv-accent) dark:bg-(--pv-accent-dark)" />
        </span>
        <span class="h-1.5 w-1/2 rounded-full bg-(--pv-line) dark:bg-(--pv-line-dark)" />
        <span class="h-1.5 w-2/3 rounded-full bg-(--pv-line) dark:bg-(--pv-line-dark)" />
      </span>
      <span class="flex flex-1 flex-col gap-1.5 p-2">
        <span
          v-for="(done, row) in TASK_ROWS"
          :key="row"
          class="flex items-center gap-1.5"
        >
          <span
            class="size-2 shrink-0 rounded-full border border-(--pv-line) dark:border-(--pv-line-dark)"
            :class="done ? 'border-(--pv-accent) bg-(--pv-accent) dark:border-(--pv-accent-dark) dark:bg-(--pv-accent-dark)' : ''"
          />
          <span class="h-1.5 flex-1 rounded-full bg-(--pv-faint) dark:bg-(--pv-faint-dark)" />
        </span>
        <span class="mt-auto h-3 w-1/2 self-end rounded-md bg-(--pv-accent) dark:bg-(--pv-accent-dark)" />
      </span>
    </span>
    <span class="flex items-center justify-between gap-2 px-1 text-sm">
      <span
        class="truncate"
        :class="active ? 'font-medium text-highlighted' : 'text-default'"
      >{{ label }}</span>
      <UIcon
        v-if="active"
        name="i-lucide-check"
        class="size-4 text-primary"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  active: boolean
  vars: Record<string, string>
  testId: string
}>()

const emit = defineEmits<{ select: [] }>()

const TASK_ROWS = [true, false, false]
</script>
