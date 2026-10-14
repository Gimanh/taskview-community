import type { TvFile } from 'taskview-api'
import $api from '@/helpers/axios'
import { useFilesStore } from '@/stores/files.store'

export function useFileDownload() {
  const filesStore = useFilesStore()

  const toAbsolute = (relative: string): string => {
    const base = $api.defaults.baseURL || window.location.origin
    return new URL(relative, base.endsWith('/') ? base : `${base}/`).toString()
  }

  const urlFor = async (file: TvFile, inline: boolean): Promise<string | null> => {
    const url = await filesStore.downloadUrl({ fileId: file.id, inline })
    return url ? toAbsolute(url) : null
  }

  const download = async (file: TvFile): Promise<void> => {
    const url = await urlFor(file, false)
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  const openInNewTab = async (file: TvFile): Promise<void> => {
    const url = await urlFor(file, true)
    if (url) window.open(url, '_blank', 'noopener')
  }

  return { urlFor, download, openInNewTab }
}
