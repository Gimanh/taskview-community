import { test, expect } from '@playwright/test'
import {
  setupAndLogin,
  addProject,
  openProjectMenu,
  cleanupProjects,
} from './test-helpers'

test.describe('Projects', () => {
  test.setTimeout(30_000)

  test.beforeEach(async ({ page }) => {
    await setupAndLogin(page)
  })

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage()
    await cleanupProjects(page)
    await page.close()
  })

  test('user can add project', async ({ page }) => {
    const projectName = `Test Project ${Date.now()}`
    await addProject(page, projectName)
  })

  test('user can edit project', async ({ page }) => {
    const projectName = `Edit Me ${Date.now()}`
    await addProject(page, projectName)
    const newName = `Edited ${Date.now()}`
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-edit').click()
    await page.getByTestId('project-edit-name').fill(newName)
    await page.getByTestId('project-edit-save').click()

    await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5000 })
  })

  test('user can delete project', async ({ page }) => {
    const projectName = `Delete Me ${Date.now()}`
    await addProject(page, projectName)
    await page.waitForTimeout(1000)
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-delete').click({ force: true })
    await page.getByTestId('confirm-delete-button').click()
    await expect(page.getByText(projectName)).toHaveCount(0)
  })

  test('user can archive project', async ({ page }) => {
    const projectName = `Archive Me ${Date.now()}`
    await addProject(page, projectName)
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-move-to-archive').click()
    await page.getByTestId('archive-list-collapsible').click()
    await expect(page.getByTestId(`project-row-${projectName}`)).toBeVisible()
  })

  test('user can unarchive project', async ({ page }) => {
    const projectName = `Unarchive Me ${Date.now()}`
    await addProject(page, projectName)
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-move-to-archive').click()
    await page.waitForTimeout(1000)
    await page.getByTestId('archive-list-collapsible').click()
    await page.getByTestId(`project-row-${projectName}`).first().waitFor({ state: 'visible', timeout: 5000 })
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-restore-from-archive').click({ force: true })
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 5000 })
  })
})
