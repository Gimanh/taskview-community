import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import type { RenderPdfPageArgs, UsePdfPagesArgs } from '@/composables/usePdfPages.types'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export function usePdfPages({ blob, pageWidth }: UsePdfPagesArgs) {
  const document = shallowRef<PDFDocumentProxy | null>(null)
  let loadingTask: PDFDocumentLoadingTask | null = null
  const pageCount = ref(0)
  const failed = ref(false)
  const tasks = new Map<number, RenderTask>()
  const generations = new Map<number, number>()

  function cancelAll() {
    tasks.forEach(task => task.cancel())
    tasks.clear()
  }

  async function open(source: Blob | null) {
    cancelAll()
    const previous = loadingTask
    loadingTask = null
    document.value = null
    pageCount.value = 0
    failed.value = false
    await previous?.destroy()
    if (!source) return
    try {
      const task = pdfjs.getDocument({ data: await source.arrayBuffer() })
      loadingTask = task
      const loaded = await task.promise
      if (loadingTask !== task) {
        await task.destroy()
        return
      }
      document.value = loaded
      pageCount.value = loaded.numPages
    } catch {
      failed.value = true
    }
  }

  async function renderPage({ pageNumber, canvas }: RenderPdfPageArgs) {
    const loaded = document.value
    if (!loaded || pageWidth.value <= 0) return
    const generation = (generations.get(pageNumber) ?? 0) + 1
    generations.set(pageNumber, generation)
    tasks.get(pageNumber)?.cancel()

    const page = await loaded.getPage(pageNumber)
    if (document.value !== loaded || generations.get(pageNumber) !== generation) return

    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: pageWidth.value / base.width })
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${Math.floor(viewport.width)}px`
    canvas.style.height = `${Math.floor(viewport.height)}px`

    const task = page.render({ canvas, viewport, transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0] })
    tasks.set(pageNumber, task)
    try {
      await task.promise
    } catch (error) {
      if (!(error instanceof pdfjs.RenderingCancelledException)) throw error
    } finally {
      if (tasks.get(pageNumber) === task) tasks.delete(pageNumber)
    }
  }

  watch(blob, open, { immediate: true })

  onBeforeUnmount(() => {
    cancelAll()
    loadingTask?.destroy()
  })

  return { pageCount, failed, renderPage }
}
