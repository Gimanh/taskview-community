import type { Page } from '@playwright/test'

export type RefreshFromPageArgs = {
  page: Page
  csrf?: string
}
