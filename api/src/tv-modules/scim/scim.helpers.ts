import type { ScimUsersSchemaTypeForSelect } from 'taskview-db-schemas'
import { isEmail } from '../../utils/helpers'
import { ScimError } from './ScimError'
import type {
  ScimApplyPatchArgs,
  ScimApplyPatchValueArgs,
  ScimErrorArgs,
  ScimFilterMatch,
  ScimListQuery,
  ScimPage,
  ScimListResponseArgs,
  ScimUserAttributes,
  ScimUserBody,
  ScimUserFilter,
  ScimUserResourceArgs,
} from './types'

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User'
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse'
const SCIM_ERROR_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:Error'

export const SCIM_DEFAULT_PAGE_SIZE = 100
export const SCIM_MAX_PAGE_SIZE = 200
const SCIM_MAX_STRING_LENGTH = 255
const SCIM_MAX_FILTER_LENGTH = 512

const EMAIL_PATH = /^emails(\[type eq "[^"]*"\])?(\.value)?$/i
const FILTER = /^\s*(emails\[type eq "[^"]*"\]\.value|[A-Za-z.]+)\s+eq\s+(.+?)\s*$/i

export function toScimError(args: ScimErrorArgs) {
  return {
    schemas: [SCIM_ERROR_SCHEMA],
    status: String(args.status),
    ...(args.scimType ? { scimType: args.scimType } : {}),
    detail: args.detail,
  }
}

export function toScimUser(args: ScimUserResourceArgs) {
  const { user, baseUrl } = args
  const name = {
    ...(user.givenName ? { givenName: user.givenName } : {}),
    ...(user.familyName ? { familyName: user.familyName } : {}),
  }

  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.scimId,
    ...(user.externalId ? { externalId: user.externalId } : {}),
    userName: user.userName,
    ...(Object.keys(name).length ? { name } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
    emails: [{ value: user.email, type: 'work', primary: true }],
    active: user.active,
    meta: {
      resourceType: 'User',
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/Users/${encodeURIComponent(user.scimId)}`,
    },
  }
}

export function toScimList(args: ScimListResponseArgs) {
  return {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: args.totalResults,
    startIndex: args.startIndex,
    itemsPerPage: args.resources.length,
    Resources: args.resources,
  }
}

export function matchScimFilter(raw: string): ScimFilterMatch {
  if (raw.length > SCIM_MAX_FILTER_LENGTH) {
    throw new ScimError({ status: 400, scimType: 'invalidFilter', detail: 'Filter is too long' })
  }
  const match = FILTER.exec(raw)
  if (!match) {
    throw new ScimError({ status: 400, scimType: 'invalidFilter', detail: `Unsupported filter: ${raw}` })
  }
  return { attribute: match[1], value: parseFilterValue(match[2]) }
}

export function parseScimFilter(raw: string): ScimUserFilter {
  const { attribute, value } = matchScimFilter(raw)
  const key = attribute.toLowerCase()

  if (key === 'username') return { attribute: 'userName', value }
  if (key === 'externalid') return { attribute: 'externalId', value }
  if (EMAIL_PATH.test(key)) return { attribute: 'email', value: value.toLowerCase() }

  throw new ScimError({ status: 400, scimType: 'invalidFilter', detail: `Filtering by ${attribute} is not supported` })
}

function parseFilterValue(raw: string): string {
  if (raw.startsWith('"')) {
    try {
      const value: unknown = JSON.parse(raw)
      if (typeof value === 'string') return value
    } catch {
      // falls through to the error below
    }
  } else if (!/\s/.test(raw)) {
    return raw
  }
  throw new ScimError({ status: 400, scimType: 'invalidFilter', detail: `Unsupported filter value: ${raw}` })
}

export function parseListQuery(query: Record<string, unknown>): ScimListQuery {
  const filter = typeof query.filter === 'string' && query.filter.trim() ? parseScimFilter(query.filter) : null
  return { filter, ...parsePage(query) }
}

export function parsePage(query: Record<string, unknown>): ScimPage {
  const startIndex = Math.max(1, toInteger(query.startIndex) ?? 1)
  const count = Math.min(SCIM_MAX_PAGE_SIZE, Math.max(0, toInteger(query.count) ?? SCIM_DEFAULT_PAGE_SIZE))
  return { startIndex, count }
}

function toInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) return null
  return Number(value)
}

export function parseActive(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  throw new ScimError({ status: 400, scimType: 'invalidValue', detail: 'active must be a boolean' })
}

export function requiredString(value: unknown, attribute: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `${attribute} must be a non-empty string` })
  }
  return limited(value.trim(), attribute)
}

export function optionalString(value: unknown, attribute: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `${attribute} must be a string` })
  }
  return value.trim() ? limited(value.trim(), attribute) : null
}

function limited(value: string, attribute: string): string {
  if (value.length > SCIM_MAX_STRING_LENGTH) {
    throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `${attribute} is longer than ${SCIM_MAX_STRING_LENGTH} characters` })
  }
  return value
}

function normalizeEmail(value: unknown): string {
  const email = requiredString(value, 'emails.value').toLowerCase()
  if (!isEmail(email)) {
    throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `${email} is not a valid email address` })
  }
  return email
}

function pickEmail(emails: unknown): string | null {
  if (!Array.isArray(emails) || emails.length === 0) return null
  const entries = emails.filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
  const isPrimary = (e: Record<string, unknown>) => e.primary === true || (typeof e.primary === 'string' && e.primary.toLowerCase() === 'true')
  const chosen = entries.find(isPrimary) ?? entries.find((e) => e.type === 'work') ?? entries[0]
  return chosen ? normalizeEmail(chosen.value) : null
}

export function attributesFromBody(body: ScimUserBody): ScimUserAttributes {
  const userName = requiredString(body.userName, 'userName')
  const email = pickEmail(body.emails) ?? (isEmail(userName) ? userName.toLowerCase() : null)
  if (!email) {
    throw new ScimError({ status: 400, scimType: 'invalidValue', detail: 'A work email is required: send emails[].value, or a userName that is an email address' })
  }

  return {
    userName,
    email,
    externalId: optionalString(body.externalId, 'externalId'),
    displayName: optionalString(body.displayName, 'displayName'),
    givenName: optionalString(body.name?.givenName, 'name.givenName'),
    familyName: optionalString(body.name?.familyName, 'name.familyName'),
    active: body.active === undefined ? true : parseActive(body.active),
  }
}

export function attributesOf(user: ScimUsersSchemaTypeForSelect): ScimUserAttributes {
  return {
    userName: user.userName,
    email: user.email,
    externalId: user.externalId,
    displayName: user.displayName,
    givenName: user.givenName,
    familyName: user.familyName,
    active: user.active,
  }
}

export function applyPatchOperations(args: ScimApplyPatchArgs): ScimUserAttributes {
  const next = { ...args.current }

  for (const operation of args.operations) {
    const op = operation.op.toLowerCase()
    if (op !== 'add' && op !== 'replace' && op !== 'remove') {
      throw new ScimError({ status: 400, scimType: 'invalidSyntax', detail: `Unsupported PATCH op: ${operation.op}` })
    }

    if (operation.path) {
      applyPatchValue({ target: next, path: operation.path, value: operation.value, remove: op === 'remove' })
      continue
    }

    if (op === 'remove' || !operation.value || typeof operation.value !== 'object' || Array.isArray(operation.value)) {
      throw new ScimError({ status: 400, scimType: 'invalidPath', detail: 'A PATCH operation without path needs an object value' })
    }
    for (const [path, value] of Object.entries(operation.value as Record<string, unknown>)) {
      applyPatchValue({ target: next, path, value, remove: false })
    }
  }

  return next
}

function applyPatchValue(args: ScimApplyPatchValueArgs) {
  const { target, path, value, remove } = args
  const key = path.trim().toLowerCase()
  const forbidRemove = () => {
    if (remove) throw new ScimError({ status: 400, scimType: 'mutability', detail: `${path} cannot be removed` })
  }

  if (key === 'active') {
    forbidRemove()
    target.active = parseActive(value)
  } else if (key === 'username') {
    forbidRemove()
    target.userName = requiredString(value, 'userName')
  } else if (key === 'externalid') {
    target.externalId = remove ? null : optionalString(value, 'externalId')
  } else if (key === 'displayname') {
    target.displayName = remove ? null : optionalString(value, 'displayName')
  } else if (key === 'name.givenname') {
    target.givenName = remove ? null : optionalString(value, 'name.givenName')
  } else if (key === 'name.familyname') {
    target.familyName = remove ? null : optionalString(value, 'name.familyName')
  } else if (key === 'name') {
    if (remove) {
      target.givenName = null
      target.familyName = null
    } else if (value && typeof value === 'object') {
      const name = value as Record<string, unknown>
      if ('givenName' in name) target.givenName = optionalString(name.givenName, 'name.givenName')
      if ('familyName' in name) target.familyName = optionalString(name.familyName, 'name.familyName')
    }
  } else if (EMAIL_PATH.test(key)) {
    forbidRemove()
    target.email = Array.isArray(value) ? (pickEmail(value) ?? target.email) : normalizeEmail(value)
  }
  // Attributes TaskView does not store (title, phoneNumbers, enterprise extension, ...) are ignored,
  // so identity providers with default attribute mappings keep syncing without errors.
}
