import { test, expect, type Locator, type Page } from '@playwright/test'
import { addDays, format, getDay, isWeekend, parseISO } from 'date-fns'
import {
  setupAndLogin,
  cleanupProjects,
  createProjectViaApi,
  createTaskViaApi,
  createTagViaApi,
  addTagToTaskViaApi,
  getUiSettingsViaApi,
  setUiSettingsViaApi,
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

// The hours view scrolls to its start time right after rendering: wait until things stop moving
async function settledBox(locator: Locator) {
  let previous = await box(locator)
  await expect.poll(async () => {
    const current = await box(locator)
    const settled = current.y === previous.y
    previous = current
    return settled
  }, { intervals: [200] }).toBe(true)
  return previous
}

// FullCalendar starts a drag only after the pointer has moved a few pixels with the button held.
// Returns the saved dates.
async function drag(page: Page, from: { x: number; y: number }, toX: number, toY = from.y) {
  const saved = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'PATCH')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(toX, toY, { steps: 15 })
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

  test('filters tasks by tag and hides weekends', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')
    const dates = await visibleDates(page)
    const [first] = dates.filter((date) => !isWeekend(parseISO(date)))
    const tagged = await createTaskViaApi(page, { goalId: projectId, description: 'Tagged', startDate: first })
    const untagged = await createTaskViaApi(page, { goalId: projectId, description: 'Untagged', startDate: first })
    const tagId = await createTagViaApi(page, { goalId: projectId, name: `Tag ${Date.now()}`, color: '#22c55e' })
    await addTagToTaskViaApi(page, tagId, tagged)

    await openCalendar(page, projectId, `?view=week&tags=${tagId}`)
    await expect(page.getByTestId(`calendar-task-${tagged}`)).toBeVisible()
    await expect(page.getByTestId(`calendar-task-${untagged}`)).toBeHidden()

    // A link with filters opens with the filter bar shown (rendered for desktop and mobile; one is hidden)
    const visibleFilter = (testId: string) => page.locator(`[data-testid="${testId}"]:visible`)
    await visibleFilter('calendar-filter-weekends').click()
    const saturday = dates.find((date) => getDay(parseISO(date)) === 6)!
    await expect(dayHeader(page, saturday)).toHaveCount(0)
    await expect(page).toHaveURL(/weekends=hidden/)

    await visibleFilter('calendar-filter-reset').click()
    await expect(page.getByTestId(`calendar-task-${untagged}`)).toBeVisible()
    await expect(dayHeader(page, saturday)).toHaveCount(1)
  })

  test('moves a timed task in the hours view to the time its card shows', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=hours')
    const [day] = (await visibleDates(page)).filter((date) => !isWeekend(parseISO(date)))
    // Times are stored in UTC: 10:00 local on that day
    const startUtc = new Date(`${day}T10:00:00`).toISOString()
    const taskId = await createTaskViaApi(page, { goalId: projectId, description: 'Meeting', startDate: startUtc.slice(0, 10), startTime: `${startUtc.slice(11, 16)}:00` })
    await page.reload()

    const card = page.getByTestId(`calendar-task-${taskId}`)
    const start = await settledBox(card)
    const slotTop = async (time: string) => (await box(page.locator(`.tv-calendar [data-time="${time}"]`).first())).y
    const oneHour = (await slotTop('11:00:00')) - (await slotTop('10:00:00'))

    const saved = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'PATCH')
    await page.mouse.move(start.x + start.width / 2, start.y + 4)
    await page.mouse.down()
    await page.mouse.move(start.x + start.width / 2, start.y + 4 + oneHour, { steps: 15 })
    // While dragging, the lifted copy shows the time it will land on
    const shownTime = (await card.filter({ hasText: 'Meeting' }).last().locator('span').first().textContent())!.trim()
    await page.mouse.up()

    const patch = JSON.parse((await saved).request().postData()!)
    const savedLocal = new Date(`${patch.startDate}T${patch.startTime.slice(0, 5)}:00Z`)
    expect(format(savedLocal, 'H:mm')).toBe(shownTime)
    expect(savedLocal.getTime()).toBeGreaterThan(new Date(`${day}T10:00:00`).getTime())
    expect(savedLocal.getMinutes() % 5).toBe(0)
  })

  test('adds a task from a day', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=week')
    const [, day] = (await visibleDates(page)).filter((date) => !isWeekend(parseISO(date)))

    // Click the empty body of that day's column, below its header
    const header = await box(dayHeader(page, day))
    await page.mouse.click(header.x + header.width / 2, header.y + header.height + 200)
    await page.getByTestId('calendar-add-input').fill('Call the printer')

    const created = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'POST')
    await page.getByTestId('calendar-add-input').press('Enter')
    const body = JSON.parse((await created).request().postData()!)
    expect(body).toMatchObject({ goalId: projectId, description: 'Call the printer', endDate: day, goalListId: null })

    const card = page.getByText('Call the printer')
    await expect(card).toBeVisible()
    const placed = await box(card)
    expect(placed.x).toBeGreaterThanOrEqual(header.x)
    expect(placed.x).toBeLessThan(header.x + header.width)
  })

  test('loads only the visible period', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    const fetchedPeriod = () => page.waitForRequest((request) => request.method() === 'GET' && /\/module\/tasks\?/.test(request.url()) && request.url().includes('dateFrom'))
      .then((request) => Object.fromEntries(['dateFrom', 'dateTo'].map((key) => [key, new URL(request.url()).searchParams.get(key)])))

    const first = fetchedPeriod()
    await openCalendar(page, projectId, '?view=week')
    const dates = await visibleDates(page)
    // One day of margin on each side: timed tasks are stored in UTC
    expect(await first).toEqual({
      dateFrom: format(addDays(parseISO(dates[0]), -1), 'yyyy-MM-dd'),
      dateTo: format(addDays(parseISO(dates[dates.length - 1]), 1), 'yyyy-MM-dd'),
    })

    const next = fetchedPeriod()
    await page.getByTestId('calendar-next').click()
    expect((await next).dateFrom).toBe(format(addDays(parseISO(dates[0]), 6), 'yyyy-MM-dd'))
  })

  test('opens a project on its calendar when that is the default view', async ({ page }) => {
    const name = `Calendar ${Date.now()}`
    await createProjectViaApi(page, name)
    // Settings are shared by every test of the user: change only the view and put them back after
    const previous = await getUiSettingsViaApi(page)
    await setUiSettingsViaApi(page, { ...previous, defaultView: 'calendar' })
    try {
      await page.reload()
      await page.getByTestId('project-select-trigger').click()
      await page.getByTestId(`project-option-${name}`).click()
      await expect(page).toHaveURL(/\/calendar/)
    } finally {
      await setUiSettingsViaApi(page, previous)
    }
  })

  test('adds a half-hour task from a click in the hours view', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Calendar ${Date.now()}`)
    await openCalendar(page, projectId, '?view=hours')
    const [, day] = (await visibleDates(page)).filter((date) => !isWeekend(parseISO(date)))
    const column = await box(dayHeader(page, day))
    const slot = await settledBox(page.locator('.tv-calendar [data-time="10:00:00"]').last())
    await page.mouse.click(column.x + column.width / 2, slot.y + 4)

    await page.getByTestId('calendar-add-input').fill('Standup')
    const created = page.waitForResponse((response) => response.url().endsWith('/module/tasks') && response.request().method() === 'POST')
    await page.getByTestId('calendar-add-input').press('Enter')
    const body = JSON.parse((await created).request().postData()!)

    // A click selects one snap step; the task gets the length of a slot instead
    const start = new Date(`${body.startDate}T${body.startTime.slice(0, 5)}:00Z`)
    const end = new Date(`${body.endDate}T${body.endTime.slice(0, 5)}:00Z`)
    expect(format(start, 'yyyy-MM-dd HH:mm')).toBe(`${day} 10:00`)
    expect((end.getTime() - start.getTime()) / 60_000).toBe(30)
  })
})
