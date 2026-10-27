import type { Page } from '@playwright/test'

export type InboxE2eAccount = {
  token: string
  email: string
  personalOrgId: number
  personalOrgSlug: string
  inboxId: number
}

export type InboxE2eCredentials = {
  login: string
  password: string
}

export type InboxE2eJwtUser = {
  id: number
  email: string
}

export type InboxE2eOrganization = {
  id: number
  slug: string
  ownerId: number
  isPersonal: number
}

export type InboxE2eGoal = {
  id: number
  isInbox: boolean
}

export type InboxE2eApiGetArgs = {
  token: string
  path: string
}

export type InboxE2eApiSendArgs = InboxE2eApiGetArgs & {
  method: 'post' | 'delete'
  data: unknown
}

export type InboxE2eOpenWorkspaceArgs = {
  page: Page
  slug: string
}
