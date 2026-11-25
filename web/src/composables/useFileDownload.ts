import type { TvFile, TvFileDownloadUrlArgs } from 'taskview-api'
import $api from '@/helpers/axios'
import { useFilesStore } from '@/stores/files.store'

export function useFileDownload() {
  const filesStore = useFilesStore()

  const toAbsolute = (relative: string): string => {
    const base = $api.defaults.baseURL || window.location.origin
    return new URL(relative, base.endsWith('/') ? base : `${base}/`).toString()
  }

  const urlForId = async (args: TvFileDownloadUrlArgs): Promise<string | null> => {
    const url = await filesStore.downloadUrl(args)
    return url ? toAbsolute(url) : null
  }

  const urlFor = (file: TvFile, inline: boolean): Promise<string | null> => urlForId({ fileId: file.id, inline })

  const download = async (file: Pick<TvFile, 'id' | 'name'>): Promise<void> => {
    const url = await urlForId({ fileId: file.id, inline: false })
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

  return { urlFor, urlForId, download, openInNewTab }
}
