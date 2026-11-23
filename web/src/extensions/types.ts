import type { Component, Ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { Locale } from '@/locales'

export type TvWebExtensionMessages = Partial<Record<Locale, Record<string, unknown>>>

/** Called once in the user menu's setup, so it may use composables and stores. */
export type UserMenuItemsProvider = () => Ref<DropdownMenuItem[]>

export type WorkspaceLink = {
  key: string
  icon: string
  label: string
  to: RouteLocationRaw
  active: boolean
}

/** Called once in the sidebar's setup, so it may use composables and stores. */
export type WorkspaceLinksProvider = () => Ref<WorkspaceLink[]>

export type TvWebExtension = {
  name: string
  routes?: RouteRecordRaw[]
  orgRoutes?: RouteRecordRaw[]
  i18nMessages?: TvWebExtensionMessages
  outlets?: Record<string, Component[]>
  /** Extra items in the user menu, shown above "Log out" */
  userMenuItems?: UserMenuItemsProvider
  /** Extra workspace links of the sidebar, shown after the built-in ones */
  workspaceLinks?: WorkspaceLinksProvider
  /** Shows the workspace links of the sidebar as a row of icon buttons instead of labelled rows */
  compactWorkspaceLinks?: boolean
}

export type CreateTaskviewAppOptions = {
  extensions?: TvWebExtension[]
}
