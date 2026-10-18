import { SCIM_GROUP_SCHEMA } from './scim.groups.helpers'
import { SCIM_MAX_PAGE_SIZE, SCIM_USER_SCHEMA } from './scim.helpers'
import type { ScimSchemaAttributeArgs } from './types'

const SPC_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'
const RESOURCE_TYPE_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:ResourceType'
const SCHEMA_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:Schema'

export function scimServiceProviderConfig(baseUrl: string) {
  return {
    schemas: [SPC_SCHEMA],
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: SCIM_MAX_PAGE_SIZE },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{
      type: 'oauthbearertoken',
      name: 'OAuth Bearer Token',
      description: 'SCIM token generated in the organization SSO settings',
      primary: true,
    }],
    meta: { resourceType: 'ServiceProviderConfig', location: `${baseUrl}/ServiceProviderConfig` },
  }
}

export function scimUserResourceType(baseUrl: string) {
  return {
    schemas: [RESOURCE_TYPE_SCHEMA],
    id: 'User',
    name: 'User',
    endpoint: '/Users',
    description: 'Organization member',
    schema: SCIM_USER_SCHEMA,
    meta: { resourceType: 'ResourceType', location: `${baseUrl}/ResourceTypes/User` },
  }
}

export function scimGroupResourceType(baseUrl: string) {
  return {
    schemas: [RESOURCE_TYPE_SCHEMA],
    id: 'Group',
    name: 'Group',
    endpoint: '/Groups',
    description: 'Group of organization members, owned by the identity provider',
    schema: SCIM_GROUP_SCHEMA,
    meta: { resourceType: 'ResourceType', location: `${baseUrl}/ResourceTypes/Group` },
  }
}

const stringAttribute = (args: ScimSchemaAttributeArgs) => ({
  type: 'string',
  multiValued: false,
  required: false,
  caseExact: false,
  mutability: 'readWrite',
  returned: 'default',
  uniqueness: 'none',
  ...args,
})

export function scimUserSchema(baseUrl: string) {
  return {
    schemas: [SCHEMA_SCHEMA],
    id: SCIM_USER_SCHEMA,
    name: 'User',
    description: 'Organization member',
    attributes: [
      stringAttribute({ name: 'userName', required: true, uniqueness: 'server' }),
      stringAttribute({ name: 'externalId', caseExact: true }),
      {
        name: 'name',
        type: 'complex',
        multiValued: false,
        required: false,
        mutability: 'readWrite',
        returned: 'default',
        subAttributes: [stringAttribute({ name: 'givenName' }), stringAttribute({ name: 'familyName' })],
      },
      stringAttribute({ name: 'displayName' }),
      {
        name: 'emails',
        type: 'complex',
        multiValued: true,
        required: true,
        mutability: 'readWrite',
        returned: 'default',
        subAttributes: [
          stringAttribute({ name: 'value', required: true }),
          stringAttribute({ name: 'type', canonicalValues: ['work'] }),
          { name: 'primary', type: 'boolean', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
        ],
      },
      { name: 'active', type: 'boolean', multiValued: false, required: false, mutability: 'readWrite', returned: 'default' },
    ],
    meta: { resourceType: 'Schema', location: `${baseUrl}/Schemas/${SCIM_USER_SCHEMA}` },
  }
}

export function scimGroupSchema(baseUrl: string) {
  return {
    schemas: [SCHEMA_SCHEMA],
    id: SCIM_GROUP_SCHEMA,
    name: 'Group',
    description: 'Group of organization members, owned by the identity provider',
    attributes: [
      stringAttribute({ name: 'displayName', required: true }),
      stringAttribute({ name: 'externalId', caseExact: true }),
      {
        name: 'members',
        type: 'complex',
        multiValued: true,
        required: false,
        mutability: 'readWrite',
        returned: 'default',
        subAttributes: [
          stringAttribute({ name: 'value', required: true, mutability: 'immutable' }),
          stringAttribute({ name: 'display', mutability: 'readOnly' }),
          { name: '$ref', type: 'reference', referenceTypes: ['User'], multiValued: false, required: false, mutability: 'immutable', returned: 'default' },
        ],
      },
    ],
    meta: { resourceType: 'Schema', location: `${baseUrl}/Schemas/${SCIM_GROUP_SCHEMA}` },
  }
}
