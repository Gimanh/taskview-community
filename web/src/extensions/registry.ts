import type { Component } from 'vue'
import type { TvWebExtension } from './types'

const outletComponents = new Map<string, Component[]>()

export function registerExtensionOutlets(extension: TvWebExtension) {
  if (!extension.outlets) return
  for (const [name, components] of Object.entries(extension.outlets)) {
    const existing = outletComponents.get(name) ?? []
    outletComponents.set(name, [...existing, ...components])
  }
}

export function getOutletComponents(name: string): Component[] {
  return outletComponents.get(name) ?? []
}
