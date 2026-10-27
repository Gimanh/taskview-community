export type CreateConfigArgs = {
  organizationId: number
  domain: string
  scimEnabled: number
}

export type SignInArgs = {
  configId: number
  email: string
  externalId: string
}

// Where the callback sent the browser: a login code on success, an error code otherwise
export type SignInOutcome = {
  tokens: boolean
  error: string | null
}
