import { boolean, char, date, integer, jsonb, numeric, smallint, timestamp, varchar } from 'drizzle-orm/pg-core'
import { BillingPgSchema, CurrenciesSchema } from './currencies.schema'
import { CounterpartiesSchema, SellersSchema, type BillingBankDetails, type BillingRequisite } from './billing.schema'
import { OrganizationsSchema } from './organizations.schema'
import { GoalsSchema } from './goals.schema'
import { TasksSchema } from './tasks.schema'
import { UsersSchema } from './users.schema'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void'
export type InvoiceDiscountType = 'percent' | 'amount'
export type InvoicePaymentTerms = 'on_receipt' | 'net7' | 'net14' | 'net30' | 'custom'
export type InvoiceLineUnit = 'service' | 'hours' | 'pcs'

export type InvoiceSellerSnapshot = {
  name: string
  legalName: string
  address: string
  email: string
  phone: string
  logoUrl: string
  bank: BillingBankDetails
  requisites: BillingRequisite[]
}

export type InvoiceCounterpartySnapshot = {
  kind: 'organization' | 'person'
  name: string
  legalName: string
  address: string
  email: string
  phone: string
  contactPerson: string
  requisites: BillingRequisite[]
}

export const InvoicesSchema = BillingPgSchema.table('invoices', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer('organization_id').notNull().references(() => OrganizationsSchema.id, { onDelete: 'cascade' }),
  goalId: integer('goal_id').references(() => GoalsSchema.id, { onDelete: 'set null' }),
  goalName: varchar('goal_name', { length: 500 }).notNull().default(''),
  sellerId: integer('seller_id').notNull().references(() => SellersSchema.id, { onDelete: 'restrict' }),
  counterpartyId: integer('counterparty_id').notNull().references(() => CounterpartiesSchema.id, { onDelete: 'restrict' }),
  number: varchar({ length: 50 }).notNull(),
  status: varchar({ length: 10 }).$type<InvoiceStatus>().notNull().default('draft'),
  reference: varchar({ length: 200 }).notNull().default(''),
  currencyCode: char('currency_code', { length: 3 }).notNull().references(() => CurrenciesSchema.code),
  issueDate: date('issue_date').notNull(),
  paymentTerms: varchar('payment_terms', { length: 20 }).$type<InvoicePaymentTerms>().notNull().default('net14'),
  dueDate: date('due_date'),
  periodFrom: date('period_from'),
  periodTo: date('period_to'),
  discountType: varchar('discount_type', { length: 10 }).$type<InvoiceDiscountType>().notNull().default('percent'),
  discountValue: numeric('discount_value', { precision: 12, scale: 2 }).notNull().default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxExempt: boolean('tax_exempt').notNull().default(false),
  taxNote: varchar('tax_note', { length: 500 }).notNull().default(''),
  notes: varchar({ length: 2000 }).notNull().default(''),
  terms: varchar({ length: 2000 }).notNull().default(''),
  sellerSnapshot: jsonb('seller_snapshot').$type<InvoiceSellerSnapshot>().notNull(),
  counterpartySnapshot: jsonb('counterparty_snapshot').$type<InvoiceCounterpartySnapshot>().notNull(),
  createdBy: integer('created_by').references(() => UsersSchema.id, { onDelete: 'set null' }),
  issuedAt: timestamp('issued_at'),
  paidAt: timestamp('paid_at'),
  voidedAt: timestamp('voided_at'),
  replacesInvoiceId: integer('replaces_invoice_id'),
  templateVersion: smallint('template_version').notNull().default(1),
  subtotal: numeric({ precision: 12, scale: 2 }),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }),
  taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }),
  total: numeric({ precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const InvoiceLinesSchema = BillingPgSchema.table('invoice_lines', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  invoiceId: integer('invoice_id').notNull().references(() => InvoicesSchema.id, { onDelete: 'cascade' }),
  position: smallint().notNull().default(0),
  taskId: integer('task_id').references(() => TasksSchema.id, { onDelete: 'set null' }),
  description: varchar({ length: 1000 }).notNull(),
  unit: varchar({ length: 20 }).$type<InvoiceLineUnit>().notNull().default('service'),
  quantity: numeric({ precision: 12, scale: 2 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
})

export type InvoicesSchemaTypeForSelect = typeof InvoicesSchema.$inferSelect
export type InvoicesSchemaTypeForInsert = typeof InvoicesSchema.$inferInsert
export type InvoiceLinesSchemaTypeForSelect = typeof InvoiceLinesSchema.$inferSelect
export type InvoiceLinesSchemaTypeForInsert = typeof InvoiceLinesSchema.$inferInsert
