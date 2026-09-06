import { boolean, char, integer, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core'
import { BillingPgSchema, CurrenciesSchema } from './currencies.schema'
import { OrganizationsSchema } from './organizations.schema'

export type BillingRequisite = {
  key: string
  label: string
  value: string
}

export type BillingBankDetails = {
  bankName: string
  accountNumber: string
  iban: string
  swift: string
  correspondentAccount: string
}

export const SellersSchema = BillingPgSchema.table('sellers', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
  name: varchar({ length: 200 }).notNull(),
  legalName: varchar('legal_name', { length: 300 }).notNull().default(''),
  address: varchar({ length: 1000 }).notNull().default(''),
  email: varchar({ length: 320 }).notNull().default(''),
  phone: varchar({ length: 50 }).notNull().default(''),
  logoUrl: varchar('logo_url', { length: 1000 }).notNull().default(''),
  currencyCode: char('currency_code', { length: 3 }).notNull().default('USD').references(() => CurrenciesSchema.code),
  bank: jsonb().$type<BillingBankDetails>().notNull(),
  requisites: jsonb().$type<BillingRequisite[]>().notNull(),
  defaultTerms: varchar('default_terms', { length: 2000 }).notNull().default(''),
  taxNote: varchar('tax_note', { length: 500 }).notNull().default(''),
  archived: boolean().notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const CounterpartiesSchema = BillingPgSchema.table('counterparties', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
  kind: varchar({ length: 20 }).$type<'organization' | 'person'>().notNull().default('organization'),
  name: varchar({ length: 200 }).notNull(),
  legalName: varchar('legal_name', { length: 300 }).notNull().default(''),
  address: varchar({ length: 1000 }).notNull().default(''),
  email: varchar({ length: 320 }).notNull().default(''),
  phone: varchar({ length: 50 }).notNull().default(''),
  contactPerson: varchar('contact_person', { length: 200 }).notNull().default(''),
  requisites: jsonb().$type<BillingRequisite[]>().notNull(),
  archived: boolean().notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type SellersSchemaTypeForSelect = typeof SellersSchema.$inferSelect
export type SellersSchemaTypeForInsert = typeof SellersSchema.$inferInsert
export type CounterpartiesSchemaTypeForSelect = typeof CounterpartiesSchema.$inferSelect
export type CounterpartiesSchemaTypeForInsert = typeof CounterpartiesSchema.$inferInsert
