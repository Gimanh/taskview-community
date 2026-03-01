import { test, expect } from '@playwright/test'
import {
  setupAndLogin,
  createProjectAndNavigate,
  cleanupProjects,
  addTaskFromList,
  openTaskDetail,
  addSubtask,
  getSubtaskCount,
  navigateToKanban,
  navigateToGraph,
} from './test-helpers'

test.describe('Subtask duplication', () => {
  test.setTimeout(60_000)

  let projectName: string

  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await cleanupProjects(page)
    await page.close()
  })

  test('adding subtask from task list does not duplicate', async ({ page }) => {
    const project = await createProjectAndNavigate(page)
    projectName = project.name

    const taskName = `List Task ${Date.now()}`
    await addTaskFromList(page, taskName)
    await openTaskDetail(page, taskName)

    const count = await addSubtask(page)
    expect(count).toBe(1)
  })

  test('adding subtask from kanban does not duplicate', async ({ page }) => {
    const project = await createProjectAndNavigate(page)
    projectName = project.name

    const taskName = `Kanban Task ${Date.now()}`
    await addTaskFromList(page, taskName)

    await navigateToKanban(page, projectName)

    await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 10000 })
    await openTaskDetail(page, taskName)

    const count = await addSubtask(page)
    expect(count).toBe(1)
  })

  test('adding subtask from graph does not duplicate', async ({ page }) => {
    const project = await createProjectAndNavigate(page)
    projectName = project.name

    const taskName = `Graph Task ${Date.now()}`
    await addTaskFromList(page, taskName)

    await navigateToGraph(page, projectName)

    await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 10000 })
    await openTaskDetail(page, taskName)

    const count = await addSubtask(page)
    expect(count).toBe(1)
  })

  test('adding multiple subtasks does not duplicate any of them', async ({ page }) => {
    const project = await createProjectAndNavigate(page)
    projectName = project.name

    const taskName = `Multi Subtask ${Date.now()}`
    await addTaskFromList(page, taskName)
    await openTaskDetail(page, taskName)

    for (let i = 0; i < 3; i++) {
      await addSubtask(page)
    }

    const count = await getSubtaskCount(page)
    expect(count).toBe(3)
  })
})
