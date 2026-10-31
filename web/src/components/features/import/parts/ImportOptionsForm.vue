<template>
  <div class="flex flex-col gap-4">
    <template
      v-for="field in fields"
      :key="field.key"
    >
      <UFormField
        v-if="field.kind === 'select'"
        :label="label(field.key)"
        :description="description(field.key)"
      >
        <USelect
          :model-value="String(model[field.key] ?? field.default)"
          :items="selectItems(field)"
          class="w-full sm:w-80"
          :data-testid="`import-option-${field.key}`"
          @update:model-value="(value) => update({ key: field.key, value: String(value) })"
        />
      </UFormField>
      <USwitch
        v-else
        :model-value="Boolean(model[field.key] ?? field.default)"
        :label="label(field.key)"
        :description="description(field.key)"
        :data-testid="`import-option-${field.key}`"
        @update:model-value="(value) => update({ key: field.key, value })"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ImportOptionField, ImportOptionValues, ImportSelectOption } from 'taskview-api'
import type { ImportOptionUpdate } from '../importProviders.types'

const props = defineProps<{
  providerId: string
  fields: ImportOptionField[]
}>()

const model = defineModel<ImportOptionValues>({ required: true })

const { t, te } = useI18n()

function base(key: string): string {
  return `import.providers.${props.providerId}.options.${key}`
}

function label(key: string): string {
  return t(`${base(key)}.label`)
}

function description(key: string): string | undefined {
  return te(`${base(key)}.description`) ? t(`${base(key)}.description`) : undefined
}

function selectItems(field: ImportSelectOption) {
  return field.values.map((value) => ({ value, label: t(`${base(field.key)}.values.${value}`) }))
}

function update(change: ImportOptionUpdate) {
  model.value = { ...model.value, [change.key]: change.value }
}
</script>
