import { useUserStore } from '@/stores/user.store'
import { Router } from 'vue-router'

export const redirectToUser = async (router: Router) => {
  const userStore: ReturnType<typeof useUserStore> = useUserStore()
  if (userStore.accessToken) {
    await router.push({ name: 'user', params: { user: userStore.login } })
  }
}