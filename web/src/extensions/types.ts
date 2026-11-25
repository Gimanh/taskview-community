import type { Component, Ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { Locale } from '@/locales'
import type { OnboardingTopicsProvider } from '@/components/features/onboarding/types'

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

export type NotificationSettingType = {
  type: string
  label: string
  description: string
}

/** Called once in the notification settings' setup, so it may use composables and stores. */
export type NotificationSettingTypesProvider = () => Ref<NotificationSettingType[]>

export type TaskDetailFieldExtension = {
  id: string
  label: string
  width: 'narrow' | 'wide'
  component: Component
}

/** Called in the setup of the task panel and of the customization screen, so it may use composables and stores. */
export type TaskDetailFieldsProvider = () => Ref<TaskDetailFieldExtension[]>

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
  /** Extra notification types the user may switch on and off, shown after the built-in ones */
  notificationSettingTypes?: NotificationSettingTypesProvider
  /** Extra blocks of the task panel: the user orders, hides and resizes them together with the built-in fields */
  taskDetailFields?: TaskDetailFieldsProvider
  /** Extra guided tours, listed after the built-in ones in Settings → Guided tours */
  onboardingTopics?: OnboardingTopicsProvider
  /** Shows the workspace links of the sidebar as a row of icon buttons instead of labelled rows */
  compactWorkspaceLinks?: boolean
}

export type CreateTaskviewAppOptions = {
  extensions?: TvWebExtension[]
}
