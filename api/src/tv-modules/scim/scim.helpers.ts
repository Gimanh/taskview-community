const SCIM_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'

export function toScimUser(member: { email: string; role: string }, active: boolean) {
  return {
    schemas: [SCIM_SCHEMA],
    id: member.email,
    userName: member.email,
    emails: [{ value: member.email, primary: true }],
    active,
    roles: [{ value: member.role }],
  }
}

export function toScimList(resources: ReturnType<typeof toScimUser>[]) {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: resources.length,
    Resources: resources,
  }
}

export function toScimError(status: number, detail: string) {
  return {
    schemas: [SCIM_ERROR_SCHEMA],
    detail,
    status: String(status),
  }
}

