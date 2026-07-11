type TaskViewRuntimeConfig = {
  apiUrl?: string
}

declare global {
  interface Window {
    __TASKVIEW_CONFIG__?: TaskViewRuntimeConfig
  }
}

export const getConfiguredApiUrl = (): string | null => {
  const url = window.__TASKVIEW_CONFIG__?.apiUrl?.trim()
  return url ? url.replace(/\/+$/, '') : null
}
