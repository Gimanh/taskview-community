import type { Page } from '@playwright/test'

export type ForeignSite = {
  url: string
  reportedPocUrl: string
  collected: string[]
}

export type ForeignSiteFixtures = {
  foreignSite: ForeignSite
}

export type CrossSiteRefreshResult = {
  read: boolean
  body?: Record<string, unknown>
}

export type WatchWireExchangeArgs = {
  page: Page
  url: string
}

export type WireExchange = {
  requestHeaders: Record<string, string>
  blockedCookies: Record<string, string[]>
  status: number
  responseHeaders: Record<string, string>
}
