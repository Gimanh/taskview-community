import { bigint, integer, pgSchema, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core'
import { UsersSchema } from './users.schema'
import { OrganizationsSchema } from './organizations.schema'

export const SsoConfigsSchema = pgSchema('tv_auth').table('sso_configs', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
  protocol: varchar().notNull(),
  displayName: varchar('display_name').notNull(),
  enabled: integer().notNull().default(1),

  samlEntryPoint: varchar('saml_entry_point'),
  samlIssuer: varchar('saml_issuer'),
  samlCert: text('saml_cert'),
  samlCallbackUrl: varchar('saml_callback_url'),
  samlSigningKey: text('saml_signing_key'),
  samlSigningCert: text('saml_signing_cert'),
  samlLogoutUrl: varchar('saml_logout_url'),

  oidcIssuer: varchar('oidc_issuer'),
  oidcClientId: varchar('oidc_client_id'),
  oidcClientSecret: varchar('oidc_client_secret'),
  oidcCallbackUrl: varchar('oidc_callback_url'),
  oidcScope: varchar('oidc_scope'),

  defaultOrgRole: varchar('default_org_role').notNull().default('member'),
  emailDomainRestriction: varchar('email_domain_restriction').notNull().unique(),

  scimToken: varchar('scim_token'),
  scimEnabled: integer('scim_enabled').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export type SsoConfigsSchemaTypeForSelect = typeof SsoConfigsSchema.$inferSelect
export type SsoConfigsSchemaTypeForInsert = typeof SsoConfigsSchema.$inferInsert

export const SsoIdentitiesSchema = pgSchema('tv_auth').table('sso_identities', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(() => UsersSchema.id, { onDelete: 'cascade' }),
  ssoConfigId: integer('sso_config_id').notNull().references(() => SsoConfigsSchema.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id').notNull(),
  email: varchar().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  unique().on(table.ssoConfigId, table.externalId),
])

export type SsoIdentitiesSchemaTypeForSelect = typeof SsoIdentitiesSchema.$inferSelect
export type SsoIdentitiesSchemaTypeForInsert = typeof SsoIdentitiesSchema.$inferInsert

export const SamlRequestCacheSchema = pgSchema('tv_auth').table('saml_request_cache', {
  key: varchar().primaryKey(),
  value: varchar().notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})
