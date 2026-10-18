import { ScimError } from './ScimError'
import { matchScimFilter, optionalString, parsePage, requiredString } from './scim.helpers'
import type {
  ScimApplyGroupPatchArgs,
  ScimApplyGroupPatchValueArgs,
  ScimGroupAttributes,
  ScimGroupBody,
  ScimGroupFilter,
  ScimGroupListQuery,
  ScimGroupResourceArgs,
} from './types'

export const SCIM_GROUP_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Group'

const MEMBER_FILTER_PATH = /^members\[value eq "([^"]*)"\]$/i

export function toScimGroup(args: ScimGroupResourceArgs) {
  const { view, baseUrl } = args
  const { group, members } = view

  return {
    schemas: [SCIM_GROUP_SCHEMA],
    id: group.scimId,
    ...(group.externalId ? { externalId: group.externalId } : {}),
    displayName: group.displayName,
    ...(members
      ? {
          members: members.map((member) => ({
            value: member.scimId,
            display: member.display,
            $ref: `${baseUrl}/Users/${encodeURIComponent(member.scimId)}`,
          })),
        }
      : {}),
    meta: {
      resourceType: 'Group',
      created: group.createdAt.toISOString(),
      lastModified: group.updatedAt.toISOString(),
      location: `${baseUrl}/Groups/${encodeURIComponent(group.scimId)}`,
    },
  }
}

export function parseGroupFilter(raw: string): ScimGroupFilter {
  const { attribute, value } = matchScimFilter(raw)
  const key = attribute.toLowerCase()

  if (key === 'displayname') return { attribute: 'displayName', value }
  if (key === 'externalid') return { attribute: 'externalId', value }

  throw new ScimError({ status: 400, scimType: 'invalidFilter', detail: `Filtering by ${attribute} is not supported` })
}

// Microsoft Entra ID reads groups with excludedAttributes=members and does not need the member list back
export function excludesMembers(query: Record<string, unknown>): boolean {
  if (typeof query.excludedAttributes !== 'string') return false
  return query.excludedAttributes.split(',').some((name) => name.trim().toLowerCase() === 'members')
}

export function parseGroupListQuery(query: Record<string, unknown>): ScimGroupListQuery {
  const filter = typeof query.filter === 'string' && query.filter.trim() ? parseGroupFilter(query.filter) : null
  return { filter, excludeMembers: excludesMembers(query), ...parsePage(query) }
}

export function groupAttributesFromBody(body: ScimGroupBody): ScimGroupAttributes {
  return {
    displayName: requiredString(body.displayName, 'displayName'),
    externalId: optionalString(body.externalId, 'externalId'),
    members: memberIds(body.members ?? []),
  }
}

export function applyGroupPatchOperations(args: ScimApplyGroupPatchArgs): ScimGroupAttributes {
  const next = { ...args.current, members: [...args.current.members] }

  for (const operation of args.operations) {
    const op = operation.op.toLowerCase()
    if (op !== 'add' && op !== 'replace' && op !== 'remove') {
      throw new ScimError({ status: 400, scimType: 'invalidSyntax', detail: `Unsupported PATCH op: ${operation.op}` })
    }

    if (operation.path) {
      applyGroupPatchValue({ target: next, path: operation.path, value: operation.value, op })
      continue
    }

    if (op === 'remove' || !operation.value || typeof operation.value !== 'object' || Array.isArray(operation.value)) {
      throw new ScimError({ status: 400, scimType: 'invalidPath', detail: 'A PATCH operation without path needs an object value' })
    }
    for (const [path, value] of Object.entries(operation.value as Record<string, unknown>)) {
      applyGroupPatchValue({ target: next, path, value, op })
    }
  }

  return next
}

function applyGroupPatchValue(args: ScimApplyGroupPatchValueArgs) {
  const { target, path, value, op } = args
  const key = path.trim().toLowerCase()

  if (key === 'displayname') {
    if (op === 'remove') throw new ScimError({ status: 400, scimType: 'mutability', detail: 'displayName cannot be removed' })
    target.displayName = requiredString(value, 'displayName')
  } else if (key === 'externalid') {
    target.externalId = op === 'remove' ? null : optionalString(value, 'externalId')
  } else if (key === 'members') {
    // A remove without value clears the whole member list (RFC 7644, section 3.5.2.2)
    const ids = op === 'remove' && value === undefined ? target.members : memberIds(value)
    if (op === 'add') target.members = [...new Set([...target.members, ...ids])]
    else if (op === 'replace') target.members = ids
    else target.members = target.members.filter((id) => !ids.includes(id))
  } else {
    const member = MEMBER_FILTER_PATH.exec(path.trim())
    if (member) {
      if (op !== 'remove') throw new ScimError({ status: 400, scimType: 'invalidPath', detail: `${path} only supports remove` })
      target.members = target.members.filter((id) => id !== member[1])
    }
  }
  // Group attributes TaskView does not store are ignored, as for users
}

function memberIds(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value]
  const ids = entries.map((entry) => {
    const id = entry && typeof entry === 'object' ? (entry as Record<string, unknown>).value : undefined
    if (typeof id !== 'string' || !id.trim()) {
      throw new ScimError({ status: 400, scimType: 'invalidValue', detail: 'Each member needs a value with the user id' })
    }
    return id.trim()
  })
  return [...new Set(ids)]
}
