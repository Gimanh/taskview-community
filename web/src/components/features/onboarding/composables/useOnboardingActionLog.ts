import type { Store } from 'pinia'
import type { OnboardingActionFilter } from '../types'

export function useOnboardingActionLog() {
  const counts = new Map<string, number>()

  function listen(store: Store, filters: Record<string, OnboardingActionFilter | null>) {
    store.$onAction(({ name, args, after }) => {
      if (!(name in filters)) return
      const filter = filters[name]
      if (filter && !filter(args)) return
      after((result) => {
        if (result === false || result === null) return
        counts.set(name, (counts.get(name) ?? 0) + 1)
      })
    })
  }

  function watchAction(name: string) {
    return () => {
      const before = counts.get(name) ?? 0
      return () => (counts.get(name) ?? 0) > before
    }
  }

  return { listen, watchAction }
}
