import { test, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test'
import { INBOX_COLLEAGUE, INBOX_OWNER } from './fixtures/auth'
import { setEnglishLocale } from './test-helpers'
import type {
  InboxE2eAccount,
  InboxE2eCredentials,
  InboxE2eApiGetArgs,
  InboxE2eApiSendArgs,
  InboxE2eGoal,
  InboxE2eJwtUser,
  InboxE2eOpenWorkspaceArgs,
  InboxE2eOrganization,
} from './inbox.spec.types'

/**
 * Being invited into a project of someone else's personal workspace makes you a member of
 * that workspace, so the workspace list holds several personal workspaces and a shared Inbox
 * may be among your projects. The sidebar Inbox must still be your own one.
 */
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:1401'
const ALL_TASKS_LIST_ID = -1401

let api: APIRequestContext
let me: InboxE2eAccount
let colleague: InboxE2eAccount

function jwtUserData(token: string): InboxE2eJwtUser {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).userData
}

async function apiGet<T>(args: InboxE2eApiGetArgs): Promise<T> {
  const response = await api.get(`${API_URL}${args.path}`, { headers: { Authorization: `Bearer ${args.token}` } })
  expect(response.status()).toBe(200)
  return (await response.json()).response
}

async function apiSend(args: InboxE2eApiSendArgs): Promise<void> {
  const response = await api[args.method](`${API_URL}${args.path}`, {
    data: args.data,
    headers: { Authorization: `Bearer ${args.token}` },
  })
  expect(response.status()).toBe(200)
}

async function accountFor(token: string): Promise<InboxE2eAccount> {
  const user = jwtUserData(token)
  const orgs = await apiGet<InboxE2eOrganization[]>({
    token,
    path: '/module/organizations',
  })
  const personal = orgs.find((org) => org.isPersonal && org.ownerId === user.id)!
  const goals = await apiGet<InboxE2eGoal[]>({
    token,
    path: `/module/goals?organizationId=${personal.id}`,
  })
  return {
    token,
    email: user.email,
    personalOrgId: personal.id,
    personalOrgSlug: personal.slug,
    inboxId: goals.find((goal) => goal.isInbox)!.id,
  }
}

async function loginByPassword(user: InboxE2eCredentials): Promise<string> {
  const response = await api.post(`${API_URL}/module/auth/login`, {
    form: { login: user.login, password: user.password },
  })
  expect(response.status()).toBe(200)
  return (await response.json()).access
}

async function loginAsOwner(page: Page) {
  await page.goto('/')
  await setEnglishLocale(page)
  await page.reload()
  await page.getByRole('tab', { name: /password/i }).click()
  await page.getByTestId('login-input').fill(INBOX_OWNER.login)
  await page.getByTestId('password-input').fill(INBOX_OWNER.password)
  await page.getByTestId('sign-in-button').click()
  await expect(page.getByTestId('sidebar-inbox-link')).toBeVisible({ timeout: 10000 })
}

async function openWorkspace(args: InboxE2eOpenWorkspaceArgs) {
  await args.page.goto(`/${args.slug}`)
  await expect(args.page.getByTestId('sidebar-inbox-link')).toBeVisible({ timeout: 10000 })
}

function sidebarInboxLink(page: Page) {
  return page.getByTestId('sidebar-inbox-link').locator('xpath=ancestor::*[.//a][1]//a/span')
}

async function openProjectPicker(page: Page) {
  await page.getByTestId('project-select-trigger').click()
}

test.describe('Sidebar Inbox', () => {
  test.beforeAll(async () => {
    api = await pwRequest.newContext()
    me = await accountFor(await loginByPassword(INBOX_OWNER))
    colleague = await accountFor(await loginByPassword(INBOX_COLLEAGUE))
    await apiSend({ method: 'post', token: colleague.token, path: '/module/collaboration', data: { goalId: colleague.inboxId, email: me.email } })
  })

  test.afterAll(async () => {
    await apiSend({
      method: 'delete',
      token: colleague.token,
      path: '/module/organizations/members',
      data: { organizationId: colleague.personalOrgId, email: me.email },
    }).catch(() => {})
    await api.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page)
  })

  test('opens your own Inbox from your personal workspace', async ({ page }) => {
    await openWorkspace({ page, slug: me.personalOrgSlug })

    await sidebarInboxLink(page).click()

    await expect(page).toHaveURL(`/${me.personalOrgSlug}/${me.inboxId}/${ALL_TASKS_LIST_ID}`)
  })

  test('opens your own Inbox from a colleague\'s personal workspace that shares their Inbox', async ({ page }) => {
    await openWorkspace({ page, slug: colleague.personalOrgSlug })

    await sidebarInboxLink(page).click()

    await expect(page).toHaveURL(`/${me.personalOrgSlug}/${me.inboxId}/${ALL_TASKS_LIST_ID}`)
  })

  test('lists a colleague\'s shared Inbox as an ordinary project of their workspace', async ({ page }) => {
    await openWorkspace({ page, slug: colleague.personalOrgSlug })
    await openProjectPicker(page)

    await page.getByTestId('project-option-Inbox').click()

    await expect(page).toHaveURL(`/${colleague.personalOrgSlug}/${colleague.inboxId}/${ALL_TASKS_LIST_ID}`)
  })

  test('keeps your own Inbox out of the project list', async ({ page }) => {
    await openWorkspace({ page, slug: me.personalOrgSlug })
    await openProjectPicker(page)

    await expect(page.getByTestId('project-option-Inbox')).toHaveCount(0)
  })
})
