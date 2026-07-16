import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import type { Locale } from '@/locales'

export type TvWebExtensionMessages = Partial<Record<Locale, Record<string, unknown>>>

export type TvWebExtension = {
  name: string
  routes?: RouteRecordRaw[]
  orgRoutes?: RouteRecordRaw[]
  i18nMessages?: TvWebExtensionMessages
  outlets?: Record<string, Component[]>
}

export type CreateTaskviewAppOptions = {
  extensions?: TvWebExtension[]
}
