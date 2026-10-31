export type ImportProviderMeta = {
  label: string
  icon: string
  // Task source links on this host or its subdomains are shown as imported from this provider
  sourceHost: string | null
  manualHelpUrl: string | null
}

export type ImportPopupMessage = {
  type: 'tv-import-auth'
  token: string | null
}

export type ImportWizardStep = 'connect' | 'project' | 'settings' | 'progress'

export type ImportPeopleSelection = Record<string, number | null>

export type ImportOptionUpdate = {
  key: string
  value: string | boolean
}

export type ImportPeopleAssignment = {
  externalId: string
  memberId: number
}
