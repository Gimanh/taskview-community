<template>
  <div class="flex flex-col gap-1">
    <UButton
      v-for="opt in items"
      :key="String(opt.value)"
      :disabled="disabled"
      color="neutral"
      variant="ghost"
      block
      size="sm"
      :icon="opt.icon"
      class="items-center justify-between gap-3"
      :ui="dropdownItemUi(`${opt.iconClass ?? ''} size-4.5`)"
      :class="!opt.color && isSelected(opt.value) ? 'bg-primary/10' : ''"
      :style="opt.color && isSelected(opt.value) ? { backgroundColor: opt.color + '14' } : undefined"
      @click="select(opt.value)"
    >
      <span class="flex-1 flex flex-col items-start text-left gap-0.5">
        <span class="text-base text-highlighted leading-tight">{{ opt.label }}</span>
        <span
          v-if="opt.description"
          class="text-xs text-muted leading-tight"
        >{{ opt.description }}</span>
      </span>

      <template #trailing>
        <span
          v-if="isSelected(opt.value)"
          class="flex items-center justify-center size-5.5 rounded-full shrink-0"
          :class="opt.color ? '' : 'bg-primary'"
          :style="opt.color ? { backgroundColor: opt.color } : undefined"
        >
          <UIcon
            name="i-lucide-check"
            class="size-4 text-white"
          />
        </span>
        <span
          v-else
          class="size-5.5 rounded-full border-2 border-default shrink-0"
        />
      </template>
    </UButton>
  </div>
</template>

<script setup lang="ts" generic="V, T = V">
import { useNuxtUiTaskItemStyles } from '@/composables/useNuxtUiTaskItemStyles'
import type { TvDropdownOption } from '@/types/tvDropdown.types'

const { dropdownItemUi } = useNuxtUiTaskItemStyles()

const model = defineModel<T>()

const { items, disabled = false, multiple = false } = defineProps<{
  items: TvDropdownOption<V>[]
  disabled?: boolean
  multiple?: boolean
}>()

function isSelected(value: V): boolean {
  return Array.isArray(model.value)
    ? (model.value as V[]).includes(value)
    : (model.value as unknown as V) === value
}

function select(value: V) {
  if (disabled) return
  if (multiple) {
    const current = Array.isArray(model.value) ? [...(model.value as V[])] : []
    const index = current.indexOf(value)
    if (index === -1) current.push(value)
    else current.splice(index, 1)
    model.value = current as unknown as T
  } else {
    model.value = value as unknown as T
  }
}
</script>
