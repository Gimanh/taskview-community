import { onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { IMPORT_POPUP_MESSAGE_TYPE } from '@/components/features/import/importProviders'
import type { ImportPopupMessage } from '@/components/features/import/importProviders.types'

const POPUP_FEATURES = 'popup=yes,width=640,height=760'

export function useImportPopupAuth() {
  const router = useRouter()
  let cleanup: (() => void) | null = null

  function authorize(authorizeUrl: string): Promise<string | null> {
    cleanup?.()
    const url = new URL(authorizeUrl)
    url.searchParams.set('return_url', new URL(router.resolve({ name: 'import-callback' }).href, window.location.origin).toString())
    const popup = window.open(url.toString(), 'tv-import-auth', POPUP_FEATURES)
    if (!popup) return Promise.resolve(null)

    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent<ImportPopupMessage>) => {
        if (event.origin !== window.location.origin || event.source !== popup) return
        if (event.data?.type !== IMPORT_POPUP_MESSAGE_TYPE) return
        finish(event.data.token)
      }
      const closedTimer = window.setInterval(() => {
        if (popup.closed) finish(null)
      }, 500)
      const finish = (token: string | null) => {
        window.removeEventListener('message', onMessage)
        window.clearInterval(closedTimer)
        cleanup = null
        resolve(token)
      }
      cleanup = () => finish(null)
      window.addEventListener('message', onMessage)
    })
  }

  onBeforeUnmount(() => cleanup?.())

  return { authorize }
}
