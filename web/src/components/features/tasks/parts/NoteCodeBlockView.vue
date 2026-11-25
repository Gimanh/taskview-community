<template>
  <NodeViewWrapper
    class="note-code group relative"
    data-testid="note-code-block"
  >
    <div
      v-if="editor.isEditable"
      contenteditable="false"
      class="absolute top-1.5 end-1.5 z-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <USelect
        :model-value="selected"
        :items="options"
        size="xs"
        color="neutral"
        variant="outline"
        :aria-label="t('tasks.noteCodeLanguage')"
        data-testid="note-code-language"
        @update:model-value="choose"
      />
    </div>
    <pre><NodeViewContent as="code" /></pre>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { NodeViewContent, NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { NoteCodeHighlighter, noteCodeHighlighter } from '@/editor/NoteCodeHighlighter'
import type { NoteCodeLanguageOption } from '@/editor/NoteCodeHighlighter.types'

const props = defineProps(nodeViewProps)

const { t } = useI18n()

const stored = computed<string | null>(() => props.node.attrs.language || null)

const selected = computed(() => {
  if (!stored.value) return NoteCodeHighlighter.PLAIN
  return noteCodeHighlighter.find(stored.value)?.id ?? stored.value
})

const options = computed<NoteCodeLanguageOption[]>(() => {
  const known = NoteCodeHighlighter.LANGUAGES.map((language) => ({ value: language.id, label: language.label }))
  const plain = { value: NoteCodeHighlighter.PLAIN, label: t('tasks.noteCodePlainText') }
  const unknown = known.some((option) => option.value === selected.value) || selected.value === NoteCodeHighlighter.PLAIN
    ? []
    : [{ value: selected.value, label: selected.value }]
  return [plain, ...known, ...unknown]
})

function choose(value: string) {
  props.updateAttributes({ language: value === NoteCodeHighlighter.PLAIN ? null : value })
}
</script>

<style scoped>
.note-code {
  --code-keyword: #cf222e;
  --code-title: #8250df;
  --code-value: #0550ae;
  --code-string: #0a3069;
  --code-builtin: #953800;
  --code-comment: #6e7781;
  --code-tag: #116329;
  --code-added-bg: #dafbe1;
  --code-removed-bg: #ffebe9;
}

.dark .note-code {
  --code-keyword: #ff7b72;
  --code-title: #d2a8ff;
  --code-value: #79c0ff;
  --code-string: #a5d6ff;
  --code-builtin: #ffa657;
  --code-comment: #8b949e;
  --code-tag: #7ee787;
  --code-added-bg: #033a16;
  --code-removed-bg: #67060c;
}

.note-code :deep(.hljs-keyword),
.note-code :deep(.hljs-doctag),
.note-code :deep(.hljs-meta .hljs-keyword),
.note-code :deep(.hljs-template-tag),
.note-code :deep(.hljs-template-variable),
.note-code :deep(.hljs-type),
.note-code :deep(.hljs-variable.language_) {
  color: var(--code-keyword);
}

.note-code :deep(.hljs-title),
.note-code :deep(.hljs-title.class_),
.note-code :deep(.hljs-title.function_) {
  color: var(--code-title);
}

.note-code :deep(.hljs-attr),
.note-code :deep(.hljs-attribute),
.note-code :deep(.hljs-literal),
.note-code :deep(.hljs-meta),
.note-code :deep(.hljs-number),
.note-code :deep(.hljs-operator),
.note-code :deep(.hljs-variable),
.note-code :deep(.hljs-selector-attr),
.note-code :deep(.hljs-selector-class),
.note-code :deep(.hljs-selector-id) {
  color: var(--code-value);
}

.note-code :deep(.hljs-string),
.note-code :deep(.hljs-regexp),
.note-code :deep(.hljs-meta .hljs-string) {
  color: var(--code-string);
}

.note-code :deep(.hljs-built_in),
.note-code :deep(.hljs-symbol) {
  color: var(--code-builtin);
}

.note-code :deep(.hljs-comment),
.note-code :deep(.hljs-code),
.note-code :deep(.hljs-formula) {
  color: var(--code-comment);
  font-style: italic;
}

.note-code :deep(.hljs-name),
.note-code :deep(.hljs-quote),
.note-code :deep(.hljs-selector-tag),
.note-code :deep(.hljs-selector-pseudo) {
  color: var(--code-tag);
}

.note-code :deep(.hljs-section) {
  color: var(--code-value);
  font-weight: 600;
}

.note-code :deep(.hljs-addition) {
  color: var(--code-tag);
  background-color: var(--code-added-bg);
}

.note-code :deep(.hljs-deletion) {
  color: var(--code-keyword);
  background-color: var(--code-removed-bg);
}
</style>
