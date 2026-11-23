import type { Component } from 'vue'
import type { TvWebExtension, UserMenuItemsProvider, WorkspaceLinksProvider } from './types'

const outletComponents = new Map<string, Component[]>()
const userMenuItemProviders: UserMenuItemsProvider[] = []
const workspaceLinkProviders: WorkspaceLinksProvider[] = []
let compactWorkspaceLinks = false

export function registerExtensionOutlets(extension: TvWebExtension) {
  if (extension.userMenuItems) userMenuItemProviders.push(extension.userMenuItems)
  if (extension.workspaceLinks) workspaceLinkProviders.push(extension.workspaceLinks)
  if (extension.compactWorkspaceLinks) compactWorkspaceLinks = true
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

export function isWorkspaceLinksCompact(): boolean {
  return compactWorkspaceLinks
}

export function getWorkspaceLinkProviders(): WorkspaceLinksProvider[] {
  return workspaceLinkProviders
}
