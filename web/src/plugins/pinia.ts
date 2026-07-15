import type { PiniaPluginContext, Store } from 'pinia'

// Device-level stores that must survive logout: server selection and app UI prefs
// are not account data and are only initialized once at app start.
const PRESERVED_STORE_IDS = new Set(['additionalUrlStore', 'app'])

const activeStores = new Set<Store>()

export function storeResetPlugin({ store, options }: PiniaPluginContext) {
  activeStores.add(store)

  // Setup-syntax stores have no built-in $reset — restore the initial state snapshot
  if (!options.state) {
    const initialState = JSON.parse(JSON.stringify(store.$state))
    store.$reset = () => {
      store.$patch((state) => {
        Object.assign(state, JSON.parse(JSON.stringify(initialState)))
      })
    }
  }
}

export function resetAccountStores() {
  activeStores.forEach((store) => {
    if (PRESERVED_STORE_IDS.has(store.$id)) return
    store.$reset()
  })
}
