import { $ls } from '@/plugins/axios'

export default async function authenticated() {
  await $ls.updateUserStoreByToken()
  if (!(await $ls.getToken())) {
    return { name: 'login' }
  }
  return true
}
