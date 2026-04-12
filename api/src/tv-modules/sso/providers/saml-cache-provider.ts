import type { CacheItem, CacheProvider } from '@node-saml/node-saml'
import { eq, lt } from 'drizzle-orm'
import { SamlRequestCacheSchema } from 'taskview-db-schemas'
import { Database } from '../../../modules/db'

export class SamlDbCacheProvider implements CacheProvider {
  private readonly db: Database
  private readonly ttlMs: number

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.db = Database.getInstance()
    this.ttlMs = ttlMs
  }

  async saveAsync(key: string, value: string): Promise<CacheItem | null> {
    const createdAt = Date.now()
    await this.db.dbDrizzle
      .insert(SamlRequestCacheSchema)
      .values({ key, value, createdAt })
      .onConflictDoUpdate({
        target: SamlRequestCacheSchema.key,
        set: { value, createdAt },
      })
    this.cleanup()
    return { value, createdAt }
  }

  async getAsync(key: string): Promise<string | null> {
    const result = await this.db.dbDrizzle
      .select()
      .from(SamlRequestCacheSchema)
      .where(eq(SamlRequestCacheSchema.key, key))

    if (!result.length) return null

    const row = result[0]
    if (Date.now() - row.createdAt > this.ttlMs) {
      await this.removeAsync(key)
      return null
    }
    return row.value
  }

  async removeAsync(key: string | null): Promise<string | null> {
    if (!key) return null
    const result = await this.db.dbDrizzle
      .delete(SamlRequestCacheSchema)
      .where(eq(SamlRequestCacheSchema.key, key))
      .returning()

    return result[0]?.value ?? null
  }

  private cleanup() {
    const cutoff = Date.now() - this.ttlMs
    this.db.dbDrizzle
      .delete(SamlRequestCacheSchema)
      .where(lt(SamlRequestCacheSchema.createdAt, cutoff))
      .catch(() => {})
  }
}
