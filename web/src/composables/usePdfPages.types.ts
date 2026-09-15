import type { Ref } from 'vue'

export type UsePdfPagesArgs = {
  blob: Ref<Blob | null>
  pageWidth: Ref<number>
}

export type RenderPdfPageArgs = {
  pageNumber: number
  canvas: HTMLCanvasElement
}
