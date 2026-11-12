import type { Component } from 'vue'
import type { TvWebExtension, UserMenuItemsProvider } from './types'

const outletComponents = new Map<string, Component[]>()
const userMenuItemProviders: UserMenuItemsProvider[] = []

export function registerExtensionOutlets(extension: TvWebExtension) {
  if (extension.userMenuItems) userMenuItemProviders.push(extension.userMenuItems)
  if (!extension.outlets) return
  for (const [name, components] of Object.entries(extension.outlets)) {
    const existing = outletComponents.get(name) ?? []
    outletComponents.set(name, [...existing, ...components])
  }
}

export function getOutletComponents(name: string): Component[] {
  return outletComponents.get(name) ?? []
}

export function getUserMenuItemProviders(): UserMenuItemsProvider[] {
  return userMenuItemProviders
}
