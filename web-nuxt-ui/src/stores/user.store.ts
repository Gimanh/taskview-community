import { defineStore } from 'pinia'
import type { JWTPayload } from '@/helpers/AppTypes'
import { parseJwt } from '@/helpers/Helper'

export const useUserStore = defineStore('user', {
  state: () => ({
    loading: true,
    login: '',
    email: '',
    accessToken: '',
    refreshToken: '',
    authType: 'jwt',
  }),
  getters: {
    isLoggedIn(state): boolean {
      return state.login.trim() !== '' && state.accessToken.trim() !== '' && state.refreshToken.trim() !== ''
    },
    payloadData(state) {
      const tokenData = parseJwt<JWTPayload>(state.accessToken)
      return tokenData?.userData
    },
  },
  actions: {
    setAccessToken(token: string) {
      this.accessToken = token
    },
    setRefreshToken(token: string) {
      this.refreshToken = token
    },
    setLogin(login: string) {
      this.login = login
    },

    setEmail(email: string) {
      this.email = email
    },

    setAuthType(type: JWTPayload['type']) {
      this.authType = type
    },
  },
})
