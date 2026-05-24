export function parseEnabledSectionIds(raw: string | undefined): string[] | null {
  if (!raw) return null
  const ids = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  return ids.length > 0 ? ids : null
}
