import { test, expect } from '@playwright/test'
import { addDays, format } from 'date-fns'
import { setupAndLogin, cleanupProjects, createProjectViaApi, createTaskViaApi } from './test-helpers'
import type { OpenDashboardArgs } from './project-dashboard.spec.types'

const dateKey = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')

async function openDashboard(args: OpenDashboardArgs) {
  await args.page.waitForURL((url) => url.pathname !== '/', { timeout: 10000 })
  const orgSlug = new URL(args.page.url()).pathname.split('/')[1]
  await args.page.goto(`/${orgSlug}/${args.projectId}/dashboard`)
}

test.describe('Project dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await cleanupProjects(page)
    await page.close()
  })

  test('shows an empty state for a project without tasks', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dashboard empty ${Date.now()}`)
    await openDashboard({ page, projectId })

    await expect(page.getByTestId('project-dashboard-empty')).toBeVisible({ timeout: 10000 })
  })

  test('counts overdue, due today and open tasks of the project', async ({ page }) => {
    const projectId = await createProjectViaApi(page, `Dashboard counts ${Date.now()}`)
    const overdueId = await createTaskViaApi(page, { goalId: projectId, description: 'Late task', endDate: dateKey(-3) })
    await createTaskViaApi(page, { goalId: projectId, description: 'Today task', endDate: dateKey(0) })
    await createTaskViaApi(page, { goalId: projectId, description: 'Undated task' })
    await openDashboard({ page, projectId })

    await expect(page.getByTestId('project-dashboard')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('project-dashboard-counter-overdue').locator('dd')).toHaveText('1')
    await expect(page.getByTestId('project-dashboard-counter-due-today').locator('dd')).toHaveText('1')
    await expect(page.getByTestId('project-dashboard-counter-open').locator('dd')).toHaveText('3')
    await expect(page.getByTestId('project-dashboard-runway-overdue')).toBeVisible()
    await expect(page.getByTestId(`project-dashboard-runway-day-${dateKey(0)}`)).toContainText('1')
    await expect(page.getByTestId(`project-dashboard-attention-task-${overdueId}`)).toContainText('Late task')
  })
})
