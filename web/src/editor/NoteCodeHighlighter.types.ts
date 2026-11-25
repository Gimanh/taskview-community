import type { LanguageFn } from 'lowlight'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export type NoteCodeGrammarModule = { default: LanguageFn }

export type NoteCodeLanguage = {
  id: string
  label: string
  aliases: string[]
  embeds?: string[]
  load: () => Promise<NoteCodeGrammarModule>
}

export type NoteCodeLanguageOption = {
  value: string
  label: string
}

export type NoteCodeHighlightArgs = {
  language: string
  value: string
}

export type NoteCodeToken = {
  text: string
  classes: string[]
}

export type NoteCodeTreeNode = {
  type: string
  value?: string
  properties?: { className?: unknown }
  children?: NoteCodeTreeNode[]
}

export type NoteCodeFlattenArgs = {
  nodes: NoteCodeTreeNode[]
  inherited: string[]
}

export type NoteCodeDocArgs = {
  doc: ProseMirrorNode
  nodeName: string
}

export type NoteCodeViewArgs = {
  view: EditorView
  nodeName: string
}

export type NoteCodeChangeArgs = {
  oldState: EditorState
  newState: EditorState
  nodeName: string
}
