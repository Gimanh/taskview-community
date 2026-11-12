import type { Component, Ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { RouteRecordRaw } from 'vue-router'
import type { Locale } from '@/locales'

export type TvWebExtensionMessages = Partial<Record<Locale, Record<string, unknown>>>

/** Called once in the user menu's setup, so it may use composables and stores. */
export type UserMenuItemsProvider = () => Ref<DropdownMenuItem[]>

export type TvWebExtension = {
  name: string
  routes?: RouteRecordRaw[]
  orgRoutes?: RouteRecordRaw[]
  i18nMessages?: TvWebExtensionMessages
  outlets?: Record<string, Component[]>
  /** Extra items in the user menu, shown above "Log out" */
  userMenuItems?: UserMenuItemsProvider
}

export type CreateTaskviewAppOptions = {
  extensions?: TvWebExtension[]
}
