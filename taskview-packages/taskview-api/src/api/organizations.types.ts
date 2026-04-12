export type Organization = {
  id: number
  name: string
  slug: string
  ownerId: number
  logoUrl: string | null
  plan: string
  createdAt: string
  updatedAt: string
  currentUserRole: 'owner' | 'admin' | 'member'
}

export type OrgMember = {
  id: number
  organizationId: number
  email: string
  role: string
  invitedBy: number | null
  createdAt: string
}

export type OrganizationArgCreate = {
  name: string
  slug?: string
  logoUrl?: string | null
}

export type OrganizationArgUpdate = {
  organizationId: number
  name?: string
  slug?: string
  logoUrl?: string | null
}

export type OrganizationArgDelete = {
  organizationId: number
}

export type OrgMemberArgAdd = {
  organizationId: number
  email: string
  role?: 'admin' | 'member'
}

export type OrgMemberArgUpdateRole = {
  organizationId: number
  email: string
  role: 'admin' | 'member'
}

export type OrgMemberArgRemove = {
  organizationId: number
  email: string
}
