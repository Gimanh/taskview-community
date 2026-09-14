<template>
  <div class="flex min-h-[60vh] flex-col">
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
      v-else-if="!blob"
      class="py-16 text-center text-sm text-muted"
    >
      {{ t('invoices.preview.pdfFailed') }}
    </p>
    <InvoicePdfPages
      v-else
      :blob="blob"
      class="min-h-0 flex-1"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InvoicePdfLang } from 'taskview-api'
import { useInvoicesStore } from '@/stores/invoices.store'
import InvoicePdfPages from '@/components/features/invoices/InvoicePdfPages.vue'

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

const blob = ref<Blob | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  const lang: InvoicePdfLang = locale.value === 'ru' ? 'ru' : 'en'
  blob.value = await invoicesStore.fetchPdf(props.invoiceId, lang)
  loading.value = false
  emit('loaded', blob.value)
}

watch(() => [props.invoiceId, props.version, locale.value], load, { immediate: true })
</script>
