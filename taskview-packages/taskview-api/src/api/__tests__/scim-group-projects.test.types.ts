export type GroupProjectsRequestArgs = {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  path: string
  body?: unknown
}

export type GroupProjectsProject = {
  goalId: number
  roleId: number
}

export type GroupProjectsLinkArgs = {
  groupId: number
  goalId: number
  roleId: number
}

export type GroupProjectsMembersArgs = {
  scimGroupId: string
  scimUserIds: string[]
}
