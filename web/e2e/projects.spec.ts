import { test, expect } from '@playwright/test'
import { login } from './test-helpers'

async function addProject(page: import('@playwright/test').Page, name: string) {
  const input = page.getByTestId('project-add-input').first()
  await input.waitFor({ state: 'visible', timeout: 15000 })
  await input.fill(name)
  await input.press('Enter')
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10000 })
}

async function openProjectMenu(page: import('@playwright/test').Page, projectName: string) {
  const row = page.getByTestId(`project-row-${projectName}`)
  await row.first().waitFor({ state: 'visible', timeout: 10000 })
  await row.first().getByTestId('project-menu-trigger').click()
}

test.describe('Projects', () => {
  test.setTimeout(15_000)

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await login(page)
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
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-delete').click()
    await page.getByRole('button', { name: /^yes|^да$/i }).click()
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
    await page.getByTestId('archive-list-collapsible').click()
    await openProjectMenu(page, projectName)
    await page.getByTestId('context-menu-restore-from-archive').click({ force: true })
    await expect(page.getByText(projectName).first()).toBeVisible({ timeout: 5000 })
  })
})
