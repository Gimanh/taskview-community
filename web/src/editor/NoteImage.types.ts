import type { Slice } from '@tiptap/pm/model'
import type { EditorView } from '@tiptap/pm/view'

export type NoteImageUploaded = {
  fileId: string
  name: string
}

export type NoteImageUploader = {
  accept: () => Promise<boolean>
  upload: (file: File) => Promise<NoteImageUploaded | null>
  attach: (files: File[]) => void
}

export type NoteImageOptions = {
  taskId: number | null
  uploader: NoteImageUploader | null
  uploadingLabel: string
}

export type NoteImagePluginOptions = {
  nodeName: string
  uploader: NoteImageUploader
  uploadingLabel: string
}

export type NoteImagePlaceholder = {
  id: string
  pos: number
}

export type NoteImagePlaceholderMeta = {
  add?: NoteImagePlaceholder
  remove?: string
}

export type NoteImagePasteArgs = {
  view: EditorView
  event: ClipboardEvent
  slice: Slice
  options: NoteImagePluginOptions
}

export type NoteImageDropArgs = {
  view: EditorView
  event: DragEvent
  moved: boolean
  options: NoteImagePluginOptions
}

export type NoteImageBatchArgs = {
  view: EditorView
  files: File[]
  pos: number | null
  options: NoteImagePluginOptions
}

export type NoteImagePlaceArgs = {
  view: EditorView
  id: string
  uploaded: NoteImageUploaded | null
  nodeName: string
}

export type NoteImageSourceArgs = {
  fileId: () => string | null
  name: () => string
  taskId: number | null
}

export type NoteImageUploadArgs = {
  goalId: number
  taskId: number
}

export type NoteImageState = 'loading' | 'ready' | 'undisplayable' | 'unavailable'
