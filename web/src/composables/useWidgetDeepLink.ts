import { onScopeDispose, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { useOrganizationStore } from '@/stores/organization.store'
import { useGoalsStore } from '@/stores/goals.store'

const OPEN_PREFIX = 'taskview://open'

let launchUrlHandled = false

export function useWidgetDeepLink() {
  if (!Capacitor.isNativePlatform()) return

  const router = useRouter()
  const orgStore = useOrganizationStore()
  const goalsStore = useGoalsStore()

  const pendingPath = ref<string | null>(null)

  const extractPath = (url: string): string | null => {
    if (!url.startsWith(OPEN_PREFIX)) return null
    const match = url.match(/[?&]path=([^&]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }

  const navigate = (url: string) => {
    const path = extractPath(url)
    console.log('[WidgetDeepLink] url:', url, '-> path:', path)
    if (path) pendingPath.value = path
  }

  watch(
    () => [pendingPath.value, orgStore.initialized, goalsStore.initialized] as const,
    ([path, orgReady, goalsReady]) => {
      if (!path) return
      console.log('[WidgetDeepLink] pending:', path, 'orgReady:', orgReady, 'goalsReady:', goalsReady)
      if (!orgReady || !goalsReady) return
      pendingPath.value = null
      // If a task is already open, replace the history entry instead of pushing —
      // otherwise consecutive widget taps stack task routes and closing one
      // reopens the previous task.
      const hasOpenTask = Boolean(router.currentRoute.value.params.taskId)
      if (hasOpenTask) {
        router.replace(path)
      } else {
        router.push(path)
      }
    },
    { immediate: true },
  )

  let remove: (() => void) | undefined
  App.addListener('appUrlOpen', ({ url }) => navigate(url)).then((handle) => {
    remove = () => handle.remove()
  })

  if (!launchUrlHandled) {
    launchUrlHandled = true
    App.getLaunchUrl().then((result) => {
      console.log('[WidgetDeepLink] launchUrl:', result?.url ?? 'none')
      if (result?.url) navigate(result.url)
    })
  }

  onScopeDispose(() => remove?.())
}
