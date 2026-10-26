import { test, expect, type Locator, type Page } from '@playwright/test'
import { format, getDay, isWeekend, parseISO } from 'date-fns'
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

// The dates shown in the week view, in display order (the first day follows the week-start preference)
async function visibleDates(page: Page) {
  const headers = page.locator('.tv-calendar [role="columnheader"][data-date]')
  return headers.evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.date!))
}

const dayHeader = (page: Page, date: string) => page.locator(`.tv-calendar [role="columnheader"][data-date="${date}"]`)

async function box(locator: Locator) {
  const rect = await locator.boundingBox()
  if (!rect) throw new Error('Element is not visible')
  return rect
}

// FullCalendar starts a drag only after the pointer has moved a few pixels with the button held.
// Returns the saved dates.
async function drag(page: Page, from: { x: number; y: number }, toX: number) {
  const saved = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'PATCH')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(toX, from.y, { steps: 15 })
  await page.mouse.up()
  const response = await saved
  expect(response.ok()).toBe(true)
  return JSON.parse(response.request().postData()!)
}

test.describe('Calendar', () => {
  // Drag and resize tests reload twice and log in through the UI: 30s is tight with parallel workers
  test.setTimeout(60_000)

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

  // Collapsing only applies when tasks can't be moved: dropping relies on equal-width columns
  test('keeps weekend days full width when tasks can be moved', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')

    const sunday = (await visibleDates(page)).find((date) => getDay(parseISO(date)) === 0)!
    await expect(dayHeader(page, sunday)).toBeVisible()
    await expect(dayHeader(page, sunday)).not.toHaveClass(/tv-calendar-collapsed/)
  })

  test('moves a task to another day by dragging it', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')
    const [from, , to] = (await visibleDates(page)).filter((date) => !isWeekend(parseISO(date)))
    const taskId = await createTaskViaApi(page, { goalId: projectId, description: 'Move me', startDate: from })
    await page.reload()

    const card = page.getByTestId(`calendar-task-${taskId}`)
    const start = await box(card)
    const target = await box(dayHeader(page, to))
    const patch = await drag(page, { x: start.x + start.width / 2, y: start.y + start.height / 2 }, target.x + target.width / 2)
    expect(patch).toMatchObject({ id: taskId, startDate: to, startTime: null })

    await page.reload()
    const moved = await box(card)
    expect(moved.x).toBeGreaterThanOrEqual(target.x)
    expect(moved.x + moved.width).toBeLessThanOrEqual(target.x + target.width)
  })

  test('stretches a task over more days by resizing it', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')
    const [first, , third] = (await visibleDates(page)).filter((date) => !isWeekend(parseISO(date)))
    const taskId = await createTaskViaApi(page, { goalId: projectId, description: 'Stretch me', startDate: first })
    await page.reload()

    // The resize handle sits on the event's end edge and shows on hover
    const card = page.getByTestId(`calendar-task-${taskId}`)
    await card.hover()
    const start = await box(card)
    const target = await box(dayHeader(page, third))
    const patch = await drag(page, { x: start.x + start.width - 2, y: start.y + start.height / 2 }, target.x + target.width / 2)
    expect(patch).toMatchObject({ id: taskId, startDate: first, endDate: third })

    await page.reload()
    const firstDay = await box(dayHeader(page, first))
    const stretched = await box(card)
    expect(stretched.x).toBeLessThan(firstDay.x + firstDay.width)
    expect(stretched.x + stretched.width).toBeGreaterThan(target.x)
  })
})
