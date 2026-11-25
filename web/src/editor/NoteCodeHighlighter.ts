import { createLowlight } from 'lowlight'
import plaintext from 'highlight.js/lib/languages/plaintext'
import type { NoteCodeHighlightArgs, NoteCodeLanguage } from '@/editor/NoteCodeHighlighter.types'

export class NoteCodeHighlighter {
  static readonly PLAIN = 'plaintext'

  static readonly LANGUAGES: NoteCodeLanguage[] = [
    { id: 'bash', label: 'Bash', aliases: ['sh', 'shell', 'zsh'], load: () => import('highlight.js/lib/languages/bash') },
    { id: 'csharp', label: 'C#', aliases: ['cs'], load: () => import('highlight.js/lib/languages/csharp') },
    { id: 'css', label: 'CSS', aliases: [], load: () => import('highlight.js/lib/languages/css') },
    { id: 'go', label: 'Go', aliases: ['golang'], load: () => import('highlight.js/lib/languages/go') },
    { id: 'xml', label: 'HTML / XML / Vue', aliases: ['html', 'svg', 'vue'], embeds: ['javascript', 'css'], load: () => import('highlight.js/lib/languages/xml') },
    { id: 'java', label: 'Java', aliases: [], load: () => import('highlight.js/lib/languages/java') },
    { id: 'javascript', label: 'JavaScript', aliases: ['js', 'jsx'], load: () => import('highlight.js/lib/languages/javascript') },
    { id: 'json', label: 'JSON', aliases: [], load: () => import('highlight.js/lib/languages/json') },
    { id: 'php', label: 'PHP', aliases: [], load: () => import('highlight.js/lib/languages/php') },
    { id: 'python', label: 'Python', aliases: ['py'], load: () => import('highlight.js/lib/languages/python') },
    { id: 'sql', label: 'SQL', aliases: [], load: () => import('highlight.js/lib/languages/sql') },
    { id: 'typescript', label: 'TypeScript', aliases: ['ts', 'tsx'], load: () => import('highlight.js/lib/languages/typescript') },
    { id: 'yaml', label: 'YAML', aliases: ['yml'], load: () => import('highlight.js/lib/languages/yaml') },
  ]

  private readonly lowlight = createLowlight({ plaintext })
  private readonly loading = new Map<string, Promise<void>>()

  find(name: string): NoteCodeLanguage | undefined {
    return NoteCodeHighlighter.LANGUAGES.find((language) => language.id === name || language.aliases.includes(name))
  }

  ensure(name: string): Promise<void> {
    const language = this.find(name)
    if (!language || this.lowlight.registered(language.id)) return Promise.resolve()

    const started = this.loading.get(language.id)
    if (started) return started

    const load = Promise.all([language.load(), ...(language.embeds ?? []).map((name) => this.ensure(name))])
      .then(([grammar]) => {
        this.lowlight.register(language.id, grammar.default)
        this.lowlight.registerAlias(language.id, language.aliases)
      })
      .finally(() => this.loading.delete(language.id))
    this.loading.set(language.id, load)
    return load
  }

  highlight({ language, value }: NoteCodeHighlightArgs) {
    return this.lowlight.highlight(language, value)
  }

  registered(name: string): boolean {
    return this.lowlight.registered(name)
  }
}

export const noteCodeHighlighter = new NoteCodeHighlighter()
