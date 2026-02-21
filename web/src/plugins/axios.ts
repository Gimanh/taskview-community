import qs from 'qs'
import { TvApi } from 'taskview-api'
import type { App } from 'vue'
import $api from '@/helpers/axios'
import LocalStorage from '@/helpers/LocalStorage'

let $ls: LocalStorage
const $tvApi: TvApi = new TvApi($api)

const api = {
  async install(app: App) {
    console.log('Install axios ------------')
    app.config.globalProperties.$ls = new LocalStorage({
      namespace: 'task_view',
      axios: $api,
    })
    app.config.globalProperties.$axios = $api

    $ls = app.config.globalProperties.$ls

    // const apiToken = await $ls.getToken();
    // if (apiToken) {
    //     $tvApi = new TvApi($api);
    // }

    console.debug('Install axios')
    await $ls.checkTokenAndSetForAxios()

    // TODO move to helpers/axios.ts
    const $axios = $api
    let isRefreshing = false
    let failedQueue: { resolve: (value: unknown) => void; reject: (value: unknown) => void }[] = []

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processQueue = (error: any, token: string | null = null) => {
      failedQueue.forEach((prom) => {
        if (error) {
          prom.reject(error)
        } else {
          prom.resolve(token)
        }
      })
      failedQueue = []
    }

    $axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response.status === 401 && !originalRequest._retry) {
          console.debug('We have 401')

          if (isRefreshing) {
            console.debug('isRefreshing token ')
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            })
              .then((token) => {
                console.debug('We got new token', token)
                originalRequest.headers.Authorization = `Bearer ${token}`
                return $axios(originalRequest)
              })
              .catch((err) => {
                return Promise.reject(err)
              })
          }
          originalRequest._retry = true
          isRefreshing = true
          const refreshToken = await $ls.getRefreshToken()
          console.log('We get refresh token')
          if (refreshToken) {
            return new Promise((resolve, reject) => {
              $axios
                .post<{
                                    access: string;
                                    refresh: string;
                                }>(
                                  '/module/auth/refresh/token',
                                  qs.stringify({ refreshToken }),
                                )
                .then((data) => {
                  console.log('We got refresh data tokens', data)
                  $ls.setToken(data.data.access)
                  $ls.setRefreshToken(data.data.refresh)
                  $ls.checkTokenAndSetForAxios()
                  $ls.updateUserStoreByToken()
                  originalRequest.headers.Authorization = `Bearer ${data.data.access}`
                  processQueue(null, data.data.access)
                  resolve($axios(originalRequest))
                })
                .catch((err) => {
                  processQueue(err, null)
                  $ls.invalidateTokens()
                  app.config.globalProperties.$router.push('/')
                  reject(err)
                })
                .finally(() => {
                  isRefreshing = false
                })
            })
          }
        }
        return Promise.reject(error)
      },
    )
  },
}

export { $ls, $tvApi }
export default api
