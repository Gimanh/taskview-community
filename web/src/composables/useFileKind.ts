import type { FileKind } from '@/types/files.types'

const ICONS: Record<FileKind, string> = {
  image: 'i-lucide-image',
  pdf: 'i-lucide-file-text',
  video: 'i-lucide-film',
  audio: 'i-lucide-music',
  text: 'i-lucide-file-text',
  other: 'i-lucide-file',
}

const TEXT_TYPES = new Set(['application/json', 'application/xml', 'application/javascript'])

export function fileKindOf(mimeType: string): FileKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('text/') || TEXT_TYPES.has(mimeType)) return 'text'
  return 'other'
}

export function fileExtensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 && dot < name.length - 1 ? name.slice(dot + 1).toUpperCase().slice(0, 5) : ''
}

export function useFileKind() {
  const kindOf = fileKindOf
  const iconOf = (mimeType: string) => ICONS[fileKindOf(mimeType)]
  const isPreviewable = (mimeType: string) => fileKindOf(mimeType) !== 'other'
  const extensionOf = fileExtensionOf

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB', 'TB']
    let value = bytes / 1024
    let unit = 0
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024
      unit += 1
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
  }

  return { kindOf, iconOf, isPreviewable, extensionOf, formatBytes }
}
