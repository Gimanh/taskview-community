export type PocketIdUserInput = {
  username: string
  email: string
  firstName: string
  lastName: string
  disabled?: boolean
}

export type PocketIdUser = PocketIdUserInput & {
  id: string
}

export type PocketIdUpdateUserArgs = {
  user: PocketIdUser
  changes: Partial<PocketIdUserInput>
}

export type PocketIdSetGroupUsersArgs = {
  groupId: string
  userIds: string[]
}

export type PocketIdScimProviderArgs = {
  endpoint: string
  token: string
  oidcClientId: string
}

export type PocketIdSyncResult = {
  status: number
  body: unknown
}

export type PocketIdGroupInput = {
  name: string
  friendlyName: string
}

export type PocketIdRenameGroupArgs = PocketIdGroupInput & {
  id: string
}

export type PocketIdSetUserGroupsArgs = {
  userId: string
  groupIds: string[]
}

export type PocketIdSetAllowedGroupsArgs = {
  clientId: string
  groupIds: string[]
}
