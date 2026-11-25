import { findChildren } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { noteCodeHighlighter } from '@/editor/NoteCodeHighlighter'
import type {
  NoteCodeChangeArgs,
  NoteCodeDocArgs,
  NoteCodeFlattenArgs,
  NoteCodeToken,
  NoteCodeViewArgs,
} from '@/editor/NoteCodeHighlighter.types'

export class NoteCodeHighlightPlugin {
  static readonly KEY = new PluginKey<DecorationSet>('noteCodeHighlight')

  static create(nodeName: string): Plugin<DecorationSet> {
    return new Plugin<DecorationSet>({
      key: this.KEY,
      state: {
        init: (_, { doc }) => this.decorate({ doc, nodeName }),
        apply: (transaction, current, oldState, newState) => {
          if (transaction.getMeta(this.KEY)) return this.decorate({ doc: transaction.doc, nodeName })
          if (!transaction.docChanged) return current
          if (this.touchesCode({ oldState, newState, nodeName })) return this.decorate({ doc: transaction.doc, nodeName })
          return current.map(transaction.mapping, transaction.doc)
        },
      },
      props: {
        decorations: (state) => this.KEY.getState(state),
      },
      view: (view) => {
        this.loadMissing({ view, nodeName })
        return {
          update: (updated, previous) => {
            if (updated.state.doc !== previous.doc) this.loadMissing({ view: updated, nodeName })
          },
        }
      },
    })
  }

  private static languages({ doc, nodeName }: NoteCodeDocArgs): string[] {
    return findChildren(doc, (node) => node.type.name === nodeName).map((block) => block.node.attrs.language ?? '')
  }

  private static touchesCode({ oldState, newState, nodeName }: NoteCodeChangeArgs): boolean {
    if (oldState.selection.$head.parent.type.name === nodeName) return true
    if (newState.selection.$head.parent.type.name === nodeName) return true
    const before = this.languages({ doc: oldState.doc, nodeName }).join('\n')
    const after = this.languages({ doc: newState.doc, nodeName }).join('\n')
    return before !== after
  }

  private static flatten({ nodes, inherited }: NoteCodeFlattenArgs): NoteCodeToken[] {
    return nodes.flatMap((node) => {
      const own = Array.isArray(node.properties?.className) ? node.properties.className.map(String) : []
      const classes = [...inherited, ...own]
      if (node.children) return this.flatten({ nodes: node.children, inherited: classes })
      return [{ text: node.value ?? '', classes }]
    })
  }

  private static decorate({ doc, nodeName }: NoteCodeDocArgs): DecorationSet {
    const decorations: Decoration[] = []

    findChildren(doc, (node) => node.type.name === nodeName).forEach((block) => {
      const language: string | null = block.node.attrs.language
      if (!language || !noteCodeHighlighter.registered(language)) return

      const tree = noteCodeHighlighter.highlight({ language, value: block.node.textContent })
      let from = block.pos + 1
      this.flatten({ nodes: tree.children, inherited: [] }).forEach((token) => {
        const to = from + token.text.length
        if (token.classes.length) decorations.push(Decoration.inline(from, to, { class: token.classes.join(' ') }))
        from = to
      })
    })

    return DecorationSet.create(doc, decorations)
  }

  private static loadMissing({ view, nodeName }: NoteCodeViewArgs) {
    const missing = this.languages({ doc: view.state.doc, nodeName })
      .filter((name) => noteCodeHighlighter.find(name) && !noteCodeHighlighter.registered(name))
    if (!missing.length) return

    Promise.all(Array.from(new Set(missing), (name) => noteCodeHighlighter.ensure(name)))
      .then(() => {
        if (!view.isDestroyed) view.dispatch(view.state.tr.setMeta(this.KEY, true))
      })
      .catch(() => undefined)
  }
}
