<template>
  <div class="flex h-full min-h-[60vh] flex-col">
    <div
      v-if="loading"
      class="flex flex-1 items-center justify-center text-muted"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin"
      />
    </div>
    <p
      v-else-if="!url"
      class="py-16 text-center text-sm text-muted"
    >
      {{ t('invoices.preview.pdfFailed') }}
    </p>
    <iframe
      v-else
      :src="url"
      :title="title"
      class="h-full min-h-[70vh] w-full flex-1 rounded-10 bg-white"
    />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InvoicePdfLang } from 'taskview-api'
import { useInvoicesStore } from '@/stores/invoices.store'

const props = defineProps<{
  invoiceId: number
  title: string
  version: string
}>()

const emit = defineEmits<{
  loaded: [blob: Blob | null]
}>()

const { t, locale } = useI18n()
const invoicesStore = useInvoicesStore()

const url = ref<string | null>(null)
const loading = ref(false)

function release() {
  if (url.value) URL.revokeObjectURL(url.value.split('#')[0])
  url.value = null
}

async function load() {
  loading.value = true
  const lang: InvoicePdfLang = locale.value === 'ru' ? 'ru' : 'en'
  const blob = await invoicesStore.fetchPdf(props.invoiceId, lang)
  release()
  if (blob) url.value = `${URL.createObjectURL(blob)}#navpanes=0&view=FitH`
  loading.value = false
  emit('loaded', blob)
}

watch(() => [props.invoiceId, props.version, locale.value], load, { immediate: true })

onBeforeUnmount(release)
</script>
