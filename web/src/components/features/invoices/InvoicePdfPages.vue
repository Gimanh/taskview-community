<template>
  <div class="flex min-h-0 flex-col gap-2">
    <InvoicePdfZoomControls v-model="zoom" />
    <div
      ref="viewport"
      class="min-h-0 flex-1 overflow-auto rounded-lg bg-neutral-100 p-2 dark:bg-neutral-900"
      data-testid="invoice-pdf-pages"
    >
      <p
        v-if="failed"
        class="py-16 text-center text-sm text-muted"
      >
        {{ t('invoices.preview.pdfFailed') }}
      </p>
      <div
        v-else
        class="flex w-max min-w-full flex-col items-center gap-3"
      >
        <canvas
          v-for="pageNumber in pageCount"
          :key="pageNumber"
          :ref="(el) => setCanvas(pageNumber, el)"
          class="bg-white shadow-sm"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, toRef, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn, useElementSize } from '@vueuse/core'
import { usePdfPages } from '@/composables/usePdfPages'
import InvoicePdfZoomControls from '@/components/features/invoices/InvoicePdfZoomControls.vue'

const props = defineProps<{
  blob: Blob | null
}>()

const { t } = useI18n()

const viewport = useTemplateRef<HTMLElement>('viewport')
const { width } = useElementSize(viewport)
const zoom = ref(1)
const pageWidth = computed(() => Math.floor(width.value * zoom.value))

const { pageCount, failed, renderPage } = usePdfPages({ blob: toRef(props, 'blob'), pageWidth })

const canvases = new Map<number, HTMLCanvasElement>()

function setCanvas(pageNumber: number, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLCanvasElement) canvases.set(pageNumber, el)
  else canvases.delete(pageNumber)
}

const renderAll = useDebounceFn(async () => {
  for (const [pageNumber, canvas] of canvases) await renderPage({ pageNumber, canvas })
}, 100)

watch([pageCount, pageWidth], () => nextTick(renderAll))
</script>
