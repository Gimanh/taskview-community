import { test, expect, type Page } from '@playwright/test'
import { format, setDate } from 'date-fns'
import {
  setupAndLogin,
  cleanupProjects,
  createProjectViaApi,
  createTaskViaApi,
} from './test-helpers'

const today = () => format(new Date(), 'yyyy-MM-dd')

// Opens the task's details from the calendar, then its date picker
async function openDatePicker(page: Page, projectId: number, taskId: number) {
  await page.waitForURL((url) => url.pathname !== '/', { timeout: 10000 })
  const orgSlug = new URL(page.url()).pathname.split('/')[1]
  await page.goto(`/${orgSlug}/${projectId}/calendar?view=week`)
  await page.getByTestId(`calendar-task-${taskId}`).click()
  await page.getByTestId('date-range-trigger').click()
}

test.describe('Task date picker', () => {
  // Opens the task twice through the calendar: 30s is tight with parallel workers
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await cleanupProjects(page)
    await page.close()
  })

  test('opens a task with two dates in range mode', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dates ${Date.now()}`)
    const taskId = await createTaskViaApi(page, { goalId: projectId, description: 'Range', startDate: today(), endDate: today() })

    await openDatePicker(page, projectId, taskId)

    await expect(page.getByRole('checkbox', { name: 'Select range' })).toBeChecked()
  })

  test('shows the times of a task that already has them', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dates ${Date.now()}`)
    const taskId = await createTaskViaApi(page, {
      goalId: projectId,
      description: 'Meeting',
      startDate: today(),
      startTime: '12:00:00',
      endDate: today(),
      endTime: '13:00:00',
    })

    await openDatePicker(page, projectId, taskId)

    await expect(page.getByRole('checkbox', { name: 'Select time' })).toBeChecked()
    await expect(page.getByTestId('date-range-start-time')).toBeVisible()
    await expect(page.getByTestId('date-range-end-time')).toBeVisible()
  })

  test('adds a time to a date-only task with the checkbox', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dates ${Date.now()}`)
    const taskId = await createTaskViaApi(page, { goalId: projectId, description: 'Deadline', endDate: today() })

    await openDatePicker(page, projectId, taskId)
    await expect(page.getByTestId('date-range-end-time')).toBeHidden()

    const saved = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'PATCH')
    await page.getByRole('checkbox', { name: 'Select time' }).click()
    const body = JSON.parse((await saved).request().postData()!)
    expect(body.endTime).toMatch(/^\d{2}:\d{2}:00$/)

    // Load the task again: the times now come from the server
    await openDatePicker(page, projectId, taskId)
    await expect(page.getByTestId('date-range-end-time')).toBeVisible()
  })

  test('saves a new range only once both ends are picked, keeping its times', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dates ${Date.now()}`)
    const taskId = await createTaskViaApi(page, {
      goalId: projectId,
      description: 'Workshop',
      startDate: today(),
      startTime: '12:00:00',
      endDate: today(),
      endTime: '13:00:00',
    })
    await openDatePicker(page, projectId, taskId)

    // Days 10 and 12 are always in the month the picker opens on
    const day = (dayOfMonth: number) => page.locator(`[data-reka-calendar-cell-trigger][data-value="${format(setDate(new Date(), dayOfMonth), 'yyyy-MM-dd')}"]`)
    const patches: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().endsWith('/module/tasks')) patches.push(request.postData()!)
    })

    await day(10).click()
    await page.waitForTimeout(500)
    expect(patches).toHaveLength(0)

    const saved = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'PATCH')
    await day(12).click()
    await saved
    expect(patches).toHaveLength(1)
    const body = JSON.parse(patches[0])
    expect(body.startTime).not.toBeNull()
    expect(body.endTime).not.toBeNull()
  })
})
