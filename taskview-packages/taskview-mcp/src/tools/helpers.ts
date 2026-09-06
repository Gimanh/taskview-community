import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

/**
 * Every tool declares all three hints explicitly. ChatGPT refuses to list an
 * app whose tools leave any of them unset, and other clients use them to decide
 * what needs confirmation. openWorldHint is false throughout: a tool only ever
 * touches the user's own TaskView instance — the one exception reaches out to
 * an email address that may belong to someone outside it.
 */
export const toolAnnotations = {
  readOnly: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  write: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  destructive: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  writeExternal: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
} as const satisfies Record<string, ToolAnnotations>

export function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

export function err(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true as const }
}
