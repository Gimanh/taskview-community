import { boolean, char, integer, pgSchema, smallint, timestamp, varchar } from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-arktype'

export const BillingPgSchema = pgSchema('tv_billing')

export const CurrenciesSchema = BillingPgSchema.table('currencies', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: char({ length: 3 }).notNull().unique(),
  numericCode: smallint('numeric_code').notNull().unique(),
  name: varchar({ length: 64 }).notNull(),
  symbol: varchar({ length: 8 }).notNull(),
  decimalDigits: smallint('decimal_digits').notNull().default(2),
  sortOrder: smallint('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type CurrenciesSchemaTypeForSelect = typeof CurrenciesSchema.$inferSelect
export type CurrenciesSchemaTypeForInsert = typeof CurrenciesSchema.$inferInsert

export const CurrenciesSchemaArkTypeInsert = createInsertSchema(CurrenciesSchema)
