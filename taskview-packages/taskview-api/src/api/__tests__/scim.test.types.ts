export type ScimTestRequestArgs = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  body?: unknown
  token?: string
  contentType?: string
}

export type ScimTestUserArgs = {
  userName?: string
  email?: string
  externalId?: string
  active?: boolean
  displayName?: string
}
