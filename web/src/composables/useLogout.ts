import $api from '@/helpers/axios'
import { $ls } from '@/plugins/axios'

export async function useLogout() {
  const result = await $api.post<{ logout: boolean }>('/module/auth/logout').catch((err) => {
    console.log(err, $api)
  })

  if (result) {
    await $ls.invalidateTokens()
    return true
  }

  return false
}
