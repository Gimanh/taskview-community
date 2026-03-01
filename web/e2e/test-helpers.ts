import { expect, type Page } from '@playwright/test'
import { TEST_USER } from './fixtures/auth'

const API_URL = 'http://localhost:1401'

// ── Cleanup ──

const createdProjectIds: number[] = []

export function trackProjectId(id: number | null) {
  if (id) createdProjectIds.push(id)
}

/**
 * Deletes all tracked projects via API. Call in afterAll.
 * Authenticates via API login to get a JWT token (page.request alone has no Bearer header).
 */
export async function cleanupProjects(page: Page) {
  if (createdProjectIds.length === 0) return

  const loginResponse = await page.request.post(`${API_URL}/module/auth/login`, {
    form: { login: TEST_USER.login, password: TEST_USER.password },
  })
  const loginData = await loginResponse.json()
  const token = loginData.access
  if (!token) {
    console.error('Cleanup: failed to get auth token, skipping project deletion')
    return
  }

  for (const id of createdProjectIds) {
    try {
      await page.request.delete(`${API_URL}/module/goals`, {
        data: { goalId: id },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      })
    } catch {
      console.error(`Failed to delete project ${id} via API`)
    }
  }
  createdProjectIds.length = 0
}

// ── Locale ──

/**
 * Sets the app locale to English via localStorage before page load.
 * Must be called after page.goto() so localStorage is available for the domain,
 * then reload to apply.
 */
export async function setEnglishLocale(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('store_task_view.task_view.locale', 'en')
  })
}

// ── Auth ──

export async function login(page: Page) {
  await page.getByRole('tab', { name: /password/i }).click()
  await page.getByTestId('login-input').fill(TEST_USER.login)
  await page.getByTestId('password-input').fill(TEST_USER.password)
  await page.getByTestId('sign-in-button').click()
}

/**
 * Navigates to `/`, sets English locale, reloads, and logs in.
 */
export async function setupAndLogin(page: Page) {
  await page.goto('/')
  await setEnglishLocale(page)
  await page.reload()
  await login(page)
}

// ── Projects ──

export async function addProject(page: Page, name: string): Promise<number | null> {
  const urlBefore = page.url()
  const input = page.getByTestId('project-add-input').first()
  await input.waitFor({ state: 'visible', timeout: 15000 })
  await input.fill(name)
  await input.press('Enter')
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
  await page.waitForFunction(
    (prev) => location.href !== prev && /\/user\/\d+\//.test(location.href),
    urlBefore,
    { timeout: 10000 },
  )
  const id = extractProjectId(page.url())
  trackProjectId(id)
  return id
}

/**
 * Creates a project, waits for auto-navigation, and tracks the ID for cleanup.
 */
export async function createProjectAndNavigate(page: Page, prefix = 'Test') {
  const projectName = `${prefix} ${Date.now()}`
  const id = await addProject(page, projectName)
  await expect(page.getByTestId('task-search-add-input')).toBeVisible({ timeout: 10000 })
  return { name: projectName, id }
}

export function extractProjectId(url: string): number | null {
  const match = url.match(/\/user\/(\d+)\//)
  return match ? Number(match[1]) : null
}

export async function openProjectMenu(page: Page, projectName: string) {
  const row = page.getByTestId(`project-row-${projectName}`)
  await row.first().waitFor({ state: 'visible', timeout: 10000 })
  await row.first().getByTestId('project-menu-trigger').click({ force: true })
}

// ── Navigation ──

export async function navigateToKanban(page: Page, projectName: string) {
  await openProjectMenu(page, projectName)
  await page.getByRole('link', { name: /kanban/i }).click()
  await page.waitForURL(/\/kanban/, { timeout: 10000 })
}

export async function navigateToGraph(page: Page, projectName: string) {
  await openProjectMenu(page, projectName)
  await page.getByRole('link', { name: /graph/i }).click()
  await page.waitForURL(/\/graph/, { timeout: 10000 })
}

// ── Tasks ──

export async function addTaskFromList(page: Page, taskName: string) {
  const input = page.getByTestId('task-search-add-input')
  await input.waitFor({ state: 'visible', timeout: 10000 })
  await input.fill(taskName)
  await input.press('Enter')
  await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 10000 })
}

export async function openTaskDetail(page: Page, taskName: string) {
  await page.getByText(taskName).first().click()
  await expect(page.getByTestId('add-subtask-button')).toBeVisible({ timeout: 10000 })
}

// ── Subtasks ──

/**
 * Clicks "Add subtask" and returns the total count of subtask items.
 */
export async function addSubtask(page: Page) {
  await page.getByTestId('add-subtask-button').click()
  await expect(page.getByTestId('subtasks-list')).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(500)
  return page.locator('[data-testid^="subtask-item-"]').count()
}

export function getSubtaskCount(page: Page) {
  return page.locator('[data-testid^="subtask-item-"]').count()
}
