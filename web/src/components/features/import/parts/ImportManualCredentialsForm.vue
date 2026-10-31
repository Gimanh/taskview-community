<template>
  <form
    class="flex flex-col gap-4"
    data-testid="import-manual-form"
    @submit.prevent="submit"
  >
    <UAlert
      color="neutral"
      variant="soft"
      icon="i-lucide-key-round"
      :title="t(`import.providers.${provider.id}.manualHelp.title`)"
    >
      <template #description>
        <ol class="list-decimal ps-4 space-y-1">
          <li>
            {{ t(`import.providers.${provider.id}.manualHelp.step1`) }}
            <ULink
              v-if="helpUrl"
              :to="helpUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="underline break-all"
            >
              {{ helpUrl }}
            </ULink>
          </li>
          <li>{{ t(`import.providers.${provider.id}.manualHelp.step2`) }}</li>
          <li>{{ t(`import.providers.${provider.id}.manualHelp.step3`) }}</li>
        </ol>
      </template>
    </UAlert>

    <UFormField
      v-for="field in provider.manualFields"
      :key="field.key"
      :label="t(`import.providers.${provider.id}.fields.${field.key}`)"
      required
    >
      <UInput
        v-model="values[field.key]"
        :type="field.secret ? 'password' : 'text'"
        autocomplete="off"
        class="w-full"
        :data-testid="`import-field-${field.key}`"
      />
    </UFormField>

    <UButton
      type="submit"
      :label="t('import.connect.submit')"
      :loading="loading"
      :disabled="!complete"
      class="self-start"
      data-testid="import-connect-submit"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportProviderInfo } from 'taskview-api'
import { IMPORT_PROVIDERS } from '../importProviders'

const props = defineProps<{
  provider: ImportProviderInfo
  loading: boolean
}>()

const emit = defineEmits<{
  submit: [credentials: Record<string, string>]
}>()

const { t } = useI18n()
const values = reactive<Record<string, string>>({})

const helpUrl = computed(() => IMPORT_PROVIDERS[props.provider.id]?.manualHelpUrl ?? null)
const complete = computed(() => props.provider.manualFields.every((field) => values[field.key]?.trim()))

function submit() {
  if (!complete.value) return
  emit(
    'submit',
    Object.fromEntries(props.provider.manualFields.map((field) => [field.key, values[field.key].trim()])),
  )
}
</script>
