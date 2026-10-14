import { test, expect, type Page } from '@playwright/test'
import { format, getDay, parseISO } from 'date-fns'
import {
  setupAndLogin,
  cleanupProjects,
  createProjectViaApi,
  createTaskViaApi,
} from './test-helpers'

async function openCalendar(page: Page, projectId: number, query = '') {
  await page.waitForURL((url) => url.pathname !== '/', { timeout: 10000 })
  const orgSlug = new URL(page.url()).pathname.split('/')[1]
  await page.goto(`/${orgSlug}/${projectId}/calendar${query}`)
  await expect(page.getByTestId('calendar-title')).toBeVisible({ timeout: 10000 })
}

test.describe('Calendar', () => {
  test.setTimeout(30_000)

  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await cleanupProjects(page)
    await page.close()
  })

  test('shows a dated task and opens its details on click', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    const description = `Dated task ${Date.now()}`
    const taskId = await createTaskViaApi(page, { goalId: projectId, description, startDate: format(new Date(), 'yyyy-MM-dd') })

    await openCalendar(page, projectId)

    const card = page.getByTestId(`calendar-task-${taskId}`)
    await expect(card).toBeVisible()
    await card.click()
    await expect(page.getByTestId('add-subtask-button')).toBeVisible({ timeout: 10000 })
  })

  test('keeps the selected view after a reload', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId)

    await page.getByTestId('calendar-view-month').click()
    await expect(page).toHaveURL(/view=month/)

    await page.reload()
    await expect(page.getByTestId('calendar-view-month')).toHaveAttribute('aria-pressed', 'true')
  })

  test('explains how to add tasks when nothing is scheduled', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await createTaskViaApi(page, { goalId: projectId, description: 'No date yet' })

    await openCalendar(page, projectId)

    await expect(page.getByTestId('calendar-empty')).toBeVisible()
  })

  test('collapses empty weekend days in the week view', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')

    // Read the visible week from the headers: its first day depends on the user's week-start preference
    const headers = page.locator('.tv-calendar [role="columnheader"][data-date]')
    const dates = await headers.evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.date!))
    const saturday = dates.find((date) => getDay(parseISO(date)) === 6)!
    const sunday = dates.find((date) => getDay(parseISO(date)) === 0)!
    await createTaskViaApi(page, { goalId: projectId, description: 'Weekend task', startDate: saturday })
    await page.reload()

    const header = (date: string) => page.locator(`.tv-calendar [role="columnheader"][data-date="${date}"]`)
    await expect(header(sunday)).toHaveClass(/tv-calendar-collapsed/)
    await expect(header(saturday)).not.toHaveClass(/tv-calendar-collapsed/)
  })
})
