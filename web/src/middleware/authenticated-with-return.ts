import type { RouteLocationNormalized } from 'vue-router'
import { $ls } from '@/plugins/axios'

/**
 * Like `authenticated`, but remembers where the user was going. The OAuth
 * consent screen is usually the first TaskView page a connector opens, so an
 * unauthenticated user must come back to it — with its query intact — instead
 * of landing on their project list with the authorization request lost.
 */
export default async function authenticatedWithReturn(to: RouteLocationNormalized) {
  await $ls.updateUserStoreByToken()
  if (!(await $ls.getToken())) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  return true
}
