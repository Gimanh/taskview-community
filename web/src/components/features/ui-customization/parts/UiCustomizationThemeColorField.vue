<template>
  <div class="flex items-center justify-between gap-3 py-2.5">
    <div class="min-w-0">
      <p class="text-sm font-medium text-highlighted">
        {{ label }}
      </p>
      <p class="text-xs text-muted">
        {{ hint }}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <UPopover>
        <button
          type="button"
          class="size-9 rounded-lg border border-accented shadow-xs outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary"
          :style="{ background: model }"
          :aria-label="t('uiCustomization.theme.custom.pickColor', { name: label })"
          :data-testid="`theme-custom-${field}-swatch`"
        />
        <template #content>
          <UColorPicker
            :model-value="model"
            class="p-3"
            @update:model-value="pick"
          />
        </template>
      </UPopover>
      <UInput
        v-model="draft"
        :maxlength="7"
        size="md"
        class="w-28"
        :ui="{ base: 'font-mono uppercase rounded-lg' }"
        :aria-label="label"
        :data-testid="`theme-custom-${field}-input`"
        @change="commit"
        @keydown.enter="commit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
  field: string
  label: string
  hint: string
}>()

const model = defineModel<string>({ required: true })

const { t } = useI18n()

const HEX_COLOR = /^#?([0-9a-fA-F]{6})$/

const draft = ref(model.value)

watch(model, (value) => {
  draft.value = value
})

function pick(value: string | undefined) {
  if (value && HEX_COLOR.test(value)) model.value = value.toLowerCase()
}

function commit() {
  const match = draft.value.trim().match(HEX_COLOR)
  if (match) {
    model.value = `#${match[1].toLowerCase()}`
  } else {
    draft.value = model.value
  }
}
</script>
