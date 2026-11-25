import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { NoteImageDrops } from '@/editor/NoteImageDrops'
import { NoteImageFiles } from '@/editor/NoteImageFiles'
import type {
  NoteImageBatchArgs,
  NoteImageDropArgs,
  NoteImagePasteArgs,
  NoteImagePlaceArgs,
  NoteImagePlaceholderMeta,
  NoteImagePluginOptions,
} from '@/editor/NoteImage.types'

export class NoteImageUploadPlugin {
  static readonly KEY = new PluginKey<DecorationSet>('noteImageUpload')

  static create(options: NoteImagePluginOptions): Plugin<DecorationSet> {
    return new Plugin<DecorationSet>({
      key: this.KEY,
      state: {
        init: () => DecorationSet.empty,
        apply: (transaction, current) => {
          let placeholders = current.map(transaction.mapping, transaction.doc)
          const meta = transaction.getMeta(this.KEY) as NoteImagePlaceholderMeta | undefined
          if (meta?.remove) placeholders = placeholders.remove(this.find(placeholders, meta.remove))
          if (meta?.add) {
            const widget = Decoration.widget(meta.add.pos, () => this.placeholder(options.uploadingLabel), { id: meta.add.id, side: 1 })
            placeholders = placeholders.add(transaction.doc, [widget])
          }
          return placeholders
        },
      },
      props: {
        decorations: (state) => this.KEY.getState(state),
        handlePaste: (view, event, slice) => this.onPaste({ view, event, slice, options }),
        handleDrop: (view, event, _slice, moved) => this.onDrop({ view, event, moved, options }),
      },
    })
  }

  private static onPaste({ view, event, slice, options }: NoteImagePasteArgs): boolean {
    const files = NoteImageFiles.images(Array.from(event.clipboardData?.files ?? [])).map((file) => NoteImageFiles.named(file))
    if (!files.length) return false

    const hasText = slice.content.textBetween(0, slice.content.size, ' ').trim().length > 0
    if (hasText) {
      // The text is pasted by the editor itself right after this handler; the images follow it
      window.setTimeout(() => void this.insert({ view, files, pos: null, options }))
      return false
    }

    event.preventDefault()
    void this.insert({ view, files, pos: null, options })
    return true
  }

  private static onDrop({ view, event, moved, options }: NoteImageDropArgs): boolean {
    if (moved) return false
    const dropped = Array.from(event.dataTransfer?.files ?? [])
    const files = NoteImageFiles.images(dropped)
    if (!files.length) return false

    event.preventDefault()
    NoteImageDrops.take(event)
    const others = dropped.filter((file) => !files.includes(file))
    if (others.length) options.uploader.attach(others)

    const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null
    void this.insert({ view, files, pos, options })
    return true
  }

  private static async insert({ view, files, pos, options }: NoteImageBatchArgs): Promise<void> {
    if (view.isDestroyed) return
    let id = this.show(view, pos ?? view.state.selection.from)

    const accepted = await options.uploader.accept()
    if (view.isDestroyed) return
    if (!accepted) {
      this.place({ view, id, uploaded: null, nodeName: options.nodeName })
      return
    }

    for (const [index, file] of files.entries()) {
      const uploaded = await options.uploader.upload(file)
      if (view.isDestroyed) return
      const next = this.place({ view, id, uploaded, nodeName: options.nodeName })
      if (index < files.length - 1) id = this.show(view, next)
    }
  }

  private static show(view: NoteImageBatchArgs['view'], pos: number): string {
    const id = crypto.randomUUID()
    const meta: NoteImagePlaceholderMeta = { add: { id, pos: Math.min(pos, view.state.doc.content.size) } }
    view.dispatch(view.state.tr.setMeta(this.KEY, meta).setMeta('addToHistory', false))
    return id
  }

  // Swaps the placeholder for the image (or just removes it) and returns the position right after
  private static place({ view, id, uploaded, nodeName }: NoteImagePlaceArgs): number {
    const [placeholder] = this.find(this.KEY.getState(view.state) ?? DecorationSet.empty, id)
    const pos = placeholder?.from ?? view.state.selection.from
    const meta: NoteImagePlaceholderMeta = { remove: id }
    const transaction = view.state.tr.setMeta(this.KEY, meta)

    if (!uploaded) {
      view.dispatch(transaction.setMeta('addToHistory', false))
      return pos
    }

    const node = view.state.schema.nodes[nodeName].create({ fileId: uploaded.fileId, alt: uploaded.name })
    transaction.replaceRangeWith(pos, pos, node)
    view.dispatch(transaction)
    return transaction.mapping.map(pos, 1)
  }

  private static find(placeholders: DecorationSet, id: string): Decoration[] {
    return placeholders.find(undefined, undefined, (spec) => spec.id === id)
  }

  private static placeholder(label: string): HTMLElement {
    const element = document.createElement('span')
    element.className = 'note-image-uploading inline-flex items-center gap-2 rounded-md bg-elevated px-2 py-1 text-sm text-muted animate-pulse'
    element.contentEditable = 'false'
    element.dataset.testid = 'note-image-uploading'
    element.textContent = label
    return element
  }
}
