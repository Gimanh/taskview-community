import { and, asc, count, eq } from 'drizzle-orm'
import {
  CounterpartiesSchema,
  CurrenciesSchema,
  InvoicesSchema,
  SellersSchema,
  type CounterpartiesSchemaTypeForSelect,
  type CurrenciesSchemaTypeForSelect,
  type SellersSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
  BillingArgList,
  CounterpartyArgCreate,
  CounterpartyArgUpdate,
  CounterpartyUpdateArgs,
  SellerArgCreate,
  SellerArgUpdate,
  SellerUpdateArgs,
  SetArchivedArgs,
} from './types'

export class BillingRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async fetchCurrencies(): Promise<CurrenciesSchemaTypeForSelect[]> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(CurrenciesSchema)
        .where(eq(CurrenciesSchema.isActive, true))
        .orderBy(asc(CurrenciesSchema.sortOrder)),
    )
    return result ?? []
  }

  async fetchSellers({ organizationId, includeArchived }: BillingArgList): Promise<SellersSchemaTypeForSelect[]> {
    const conditions = [eq(SellersSchema.organizationId, organizationId)]
    if (!includeArchived) conditions.push(eq(SellersSchema.archived, false))
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select().from(SellersSchema).where(and(...conditions)).orderBy(asc(SellersSchema.name)),
    )
    return result ?? []
  }

  async fetchSellerById(sellerId: number): Promise<SellersSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select().from(SellersSchema).where(eq(SellersSchema.id, sellerId)),
    )
    return result?.[0] ?? null
  }

  private sellerColumns(data: SellerArgUpdate) {
    return {
      name: data.name,
      legalName: data.legalName,
      address: data.address,
      email: data.email,
      phone: data.phone,
      logoUrl: data.logoUrl,
      currencyCode: data.currencyCode,
      bank: data.bank,
      requisites: data.requisites,
      defaultTerms: data.defaultTerms,
      taxNote: data.taxNote,
    }
  }

  private counterpartyColumns(data: CounterpartyArgUpdate) {
    return {
      kind: data.kind,
      name: data.name,
      legalName: data.legalName,
      address: data.address,
      email: data.email,
      phone: data.phone,
      contactPerson: data.contactPerson,
      requisites: data.requisites,
    }
  }

  async createSeller(data: SellerArgCreate): Promise<SellersSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(SellersSchema)
        .values({ organizationId: data.organizationId, ...this.sellerColumns(data) })
        .returning(),
    )
    return result?.[0] ?? null
  }

  async updateSeller({ sellerId, data }: SellerUpdateArgs): Promise<SellersSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(SellersSchema)
        .set({ ...this.sellerColumns(data), updatedAt: new Date() })
        .where(eq(SellersSchema.id, sellerId))
        .returning(),
    )
    return result?.[0] ?? null
  }

  async setSellerArchived({ id, archived }: SetArchivedArgs): Promise<SellersSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(SellersSchema)
        .set({ archived, updatedAt: new Date() })
        .where(eq(SellersSchema.id, id))
        .returning(),
    )
    return result?.[0] ?? null
  }

  async deleteSeller(sellerId: number): Promise<boolean> {
    const result = await callWithCatch(() => this.db.dbDrizzle.delete(SellersSchema).where(eq(SellersSchema.id, sellerId)))
    return !!result?.rowCount
  }

  async countInvoicesBySeller(sellerId: number): Promise<number> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select({ total: count() }).from(InvoicesSchema).where(eq(InvoicesSchema.sellerId, sellerId)),
    )
    return result?.[0]?.total ?? 0
  }

  async fetchCounterparties({ organizationId, includeArchived }: BillingArgList): Promise<CounterpartiesSchemaTypeForSelect[]> {
    const conditions = [eq(CounterpartiesSchema.organizationId, organizationId)]
    if (!includeArchived) conditions.push(eq(CounterpartiesSchema.archived, false))
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(CounterpartiesSchema)
        .where(and(...conditions))
        .orderBy(asc(CounterpartiesSchema.name)),
    )
    return result ?? []
  }

  async fetchCounterpartyById(counterpartyId: number): Promise<CounterpartiesSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select().from(CounterpartiesSchema).where(eq(CounterpartiesSchema.id, counterpartyId)),
    )
    return result?.[0] ?? null
  }

  async createCounterparty(data: CounterpartyArgCreate): Promise<CounterpartiesSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .insert(CounterpartiesSchema)
        .values({ organizationId: data.organizationId, ...this.counterpartyColumns(data) })
        .returning(),
    )
    return result?.[0] ?? null
  }

  async updateCounterparty({ counterpartyId, data }: CounterpartyUpdateArgs): Promise<CounterpartiesSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(CounterpartiesSchema)
        .set({ ...this.counterpartyColumns(data), updatedAt: new Date() })
        .where(eq(CounterpartiesSchema.id, counterpartyId))
        .returning(),
    )
    return result?.[0] ?? null
  }

  async setCounterpartyArchived({ id, archived }: SetArchivedArgs): Promise<CounterpartiesSchemaTypeForSelect | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(CounterpartiesSchema)
        .set({ archived, updatedAt: new Date() })
        .where(eq(CounterpartiesSchema.id, id))
        .returning(),
    )
    return result?.[0] ?? null
  }

  async deleteCounterparty(counterpartyId: number): Promise<boolean> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.delete(CounterpartiesSchema).where(eq(CounterpartiesSchema.id, counterpartyId)),
    )
    return !!result?.rowCount
  }

  async countInvoicesByCounterparty(counterpartyId: number): Promise<number> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ total: count() })
        .from(InvoicesSchema)
        .where(eq(InvoicesSchema.counterpartyId, counterpartyId)),
    )
    return result?.[0]?.total ?? 0
  }
}
