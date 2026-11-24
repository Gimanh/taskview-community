import type { DepOptimizationOptions } from 'vite'

// Nuxt UI is served unbundled and pulls Tiptap/ProseMirror in as raw modules.
// Tiptap packages imported by the app must stay unbundled too, otherwise the
// dev server ends up with two ProseMirror copies and the editor fails to mount.
export const editorOptimizeDeps: DepOptimizationOptions = {
  exclude: [
    '@tiptap/core',
    '@tiptap/pm',
    '@tiptap/vue-3',
    '@tiptap/extension-text-align',
    '@tiptap/extension-code-block',
  ],
}
