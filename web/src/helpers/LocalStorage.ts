import { Preferences } from '@capacitor/preferences'
import type { AxiosInstance } from 'axios'
import type { JWTPayload } from '@/helpers/AppTypes'
import { parseJwt } from '@/helpers/Helper'
import { useUserStore } from '@/stores/user.store'

export const ACCESS_TOKEN_KEY = 'access'
export const REFRESH_TOKEN_KEY = 'refresh'

export default class LocalStorage {
  protected namespace: string = ''

  protected axios!: AxiosInstance

  public isLoggedIn: boolean = false

  protected userStore!: ReturnType<typeof useUserStore>

  constructor(options: { namespace: string; axios: AxiosInstance }) {
    this.namespace = options.namespace
    this.axios = options.axios
    this.getToken().then(async (token) => {
      this.isLoggedIn = !!token
      this.userStore = useUserStore()
      this.userStore.loading = false
      await this.updateUserStoreByToken()
    })
  }

  private key(key: string): string {
    return `${this.namespace}.${key}`
  }

  async getValue(key: string): Promise<string | null> {
    await Preferences.configure({ group: `store_${this.namespace}` })
    return (await Preferences.get({ key: this.key(key) })).value
  }

  async removeKey(key: string) {
    await Preferences.configure({ group: `store_${this.namespace}` })
    await Preferences.remove({ key: this.key(key) })
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  async setValue(key: string, value: { [key: string]: any } | string): Promise<void> {
    await Preferences.configure({ group: `store_${this.namespace}` })
    if (typeof value !== 'string') {
      value = JSON.stringify(value)
    }
    Preferences.set({
      key: this.key(key),
      value: value,
    })
  }

  setToken(token: string): void {
    this.setValue(ACCESS_TOKEN_KEY, token)
    this.checkTokenAndSetForAxios()
    this.isLoggedIn = true
  }

  setRefreshToken(refreshToken: string): void {
    this.setValue(REFRESH_TOKEN_KEY, refreshToken)
  }

  async getToken(): Promise<string | null> {
    const token = await this.getValue(ACCESS_TOKEN_KEY)
    if (token && token.split('.').length === 3) {
      return token
    }
    return null
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.getValue(REFRESH_TOKEN_KEY)
  }

  async checkTokenAndSetForAxios(): Promise<void> {
    const token = await this.getToken()
    if (token) {
      this.axios.defaults.headers.common.Authorization = `Bearer ${token}`
    }
  }

  async invalidateTokens() {
    await this.removeKey(REFRESH_TOKEN_KEY)
    await this.removeKey(ACCESS_TOKEN_KEY)
    delete this.axios.defaults.headers.common.Authorization
    this.isLoggedIn = false
    if (this.userStore) {
      this.userStore.setAccessToken('')
      this.userStore.setRefreshToken('')
      this.userStore.setLogin('')
      this.userStore.setEmail('')
    }
  }

  async updateUserStoreByToken() {
    const accessToken = await this.getToken()
    if (accessToken && this.userStore) {
      this.userStore.setAccessToken(accessToken)
      const refreshToken = await this.getRefreshToken()
      if (refreshToken) {
        this.userStore.setRefreshToken(refreshToken)
      }

      const payload = parseJwt<JWTPayload>(accessToken)
      if (payload) {
        this.userStore.setLogin(payload.userData.login)
        this.userStore.setEmail(payload.userData.email)
      }
    }
  }
}
