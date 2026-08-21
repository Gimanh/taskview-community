import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import $api from '@/helpers/axios'
import { $ls, $tvApi } from '@/plugins/axios'
import { additionalUrlStore } from '@/stores/additional-url.store'
import { getConfiguredApiUrl } from '@/helpers/serverConfig'
import { normalizeServerUrl } from '@/helpers/serverUrl'

export const LS_KEY_ADDITIONAL_SERVERS = 'additionalServers'
export const LS_KEY_MAIN_SERVER = 'mainServer'

/**
 * Use this composition to get and set additional servers and main server for API requests
 * User can add additional servers and set main server from local storage
 * Also user can delete additional server
 * @returns
 */
export const useAdditionalServer = async () => {
  const { allServers, mainServer, systemServer } = storeToRefs(additionalUrlStore())
  const serversFromLocalStorage = ref<string | null>(await $ls.getValue(LS_KEY_ADDITIONAL_SERVERS))
  const mainServerFromLocalStorage = await $ls.getValue(LS_KEY_MAIN_SERVER)
  const configuredApiUrl = getConfiguredApiUrl()

  allServers.value = serversFromLocalStorage.value ? [...JSON.parse(serversFromLocalStorage.value)] : []

  mainServer.value =
    configuredApiUrl ||
    mainServerFromLocalStorage ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:1401' : 'https://api.taskview.tech')

  systemServer.value =
    configuredApiUrl ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:1401' : 'https://api.taskview.tech')

  const setMainServer = (server: string) => {
    const normalized = normalizeServerUrl(server) ?? server
    mainServer.value = normalized
    $ls.setValue(LS_KEY_MAIN_SERVER, normalized)
    $api.defaults.baseURL = normalized
    $tvApi?.setBaseUrl(normalized)
  }

  const addServer = (server: string) => {
    const normalized = normalizeServerUrl(server) ?? server
    allServers.value.push(normalized)
    $ls.setValue(LS_KEY_ADDITIONAL_SERVERS, allServers.value)
  }

  const deleteServer = (server: string) => {
    allServers.value = allServers.value.filter((s) => s !== server)
    $ls.setValue(LS_KEY_ADDITIONAL_SERVERS, allServers.value)

    if (mainServer.value === server) {
      setMainServer(systemServer.value)
    }
  }

  return {
    mainServer,
    allServers,
    setMainServer,
    addServer,
    systemServer,
    deleteServer,
  }
}
