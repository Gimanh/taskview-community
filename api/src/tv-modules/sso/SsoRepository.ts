import { and, eq } from 'drizzle-orm'
import {
  SsoConfigsSchema,
  SsoIdentitiesSchema,
  type SsoConfigsSchemaTypeForSelect,
  type SsoConfigsSchemaTypeForInsert,
  type SsoIdentitiesSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'

export class SsoRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async findEnabledByDomain(domain: string): Promise<SsoConfigsSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoConfigsSchema)
        .where(
          and(
            eq(SsoConfigsSchema.emailDomainRestriction, domain.toLowerCase()),
            eq(SsoConfigsSchema.enabled, 1),
          )
        )
    )
    if (!result || result.length === 0) return null
    return result[0]
  }

  async findEnabledById(id: number): Promise<SsoConfigsSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoConfigsSchema)
        .where(
          and(
            eq(SsoConfigsSchema.id, id),
            eq(SsoConfigsSchema.enabled, 1),
          )
        )
    )
    if (!result || result.length === 0) return null
    return result[0]
  }

  async listEnabledByOrgId(orgId: number): Promise<SsoConfigsSchemaTypeForSelect[]> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoConfigsSchema)
        .where(
          and(
            eq(SsoConfigsSchema.organizationId, orgId),
            eq(SsoConfigsSchema.enabled, 1),
          )
        )
    )
    return result ?? []
  }

  async listByOrgId(orgId: number): Promise<SsoConfigsSchemaTypeForSelect[]> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoConfigsSchema)
        .where(eq(SsoConfigsSchema.organizationId, orgId))
    )
    return result ?? []
  }

  async findById(id: number): Promise<SsoConfigsSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoConfigsSchema)
        .where(eq(SsoConfigsSchema.id, id))
    )
    if (!result || result.length === 0) return null
    return result[0]
  }

  async create(data: SsoConfigsSchemaTypeForInsert): Promise<SsoConfigsSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(SsoConfigsSchema)
        .values(data)
        .returning()
    )
    if (!result || result.length === 0) return null
    return result[0]
  }

  async update(id: number, data: Partial<SsoConfigsSchemaTypeForInsert>): Promise<SsoConfigsSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(SsoConfigsSchema)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(SsoConfigsSchema.id, id))
        .returning()
    )
    if (!result || result.length === 0) return null
    return result[0]
  }

  async delete(id: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .delete(SsoConfigsSchema)
        .where(eq(SsoConfigsSchema.id, id))
    )
    return !!(result?.rowCount && result.rowCount > 0)
  }

  async upsertIdentity(data: {
    userId: number
    ssoConfigId: number
    externalId: string
    email: string
  }): Promise<SsoIdentitiesSchemaTypeForSelect | null> {
    const existing = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(SsoIdentitiesSchema)
        .where(
          and(
            eq(SsoIdentitiesSchema.ssoConfigId, data.ssoConfigId),
            eq(SsoIdentitiesSchema.externalId, data.externalId),
          )
        )
    )

    if (existing && existing.length > 0) {
      const result = await callWithCatch(() =>
        this.db.dbDrizzle
          .update(SsoIdentitiesSchema)
          .set({
            email: data.email,
            lastLoginAt: new Date(),
          })
          .where(eq(SsoIdentitiesSchema.id, existing[0].id))
          .returning()
      )
      if (!result || result.length === 0) return null
      return result[0]
    }

    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(SsoIdentitiesSchema)
        .values({
          userId: data.userId,
          ssoConfigId: data.ssoConfigId,
          externalId: data.externalId,
          email: data.email,
          lastLoginAt: new Date(),
        })
        .returning()
    )
    if (!result || result.length === 0) return null
    return result[0]
  }
}
