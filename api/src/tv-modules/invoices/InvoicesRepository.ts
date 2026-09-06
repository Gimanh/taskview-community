import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import {
  CounterpartiesSchema,
  GoalsSchema,
  InvoiceLinesSchema,
  InvoicesSchema,
  type InvoiceLinesSchemaTypeForSelect,
  type InvoicesSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import type {
  InvoiceArgList,
  InvoiceArgUpdate,
  InvoiceCreateRepoArgs,
  InvoiceLineArg,
  InvoiceNextNumberArgs,
  InvoiceSetReplacesArgs,
  InvoiceStatusRepoArgs,
  InvoiceUpdateRepoArgs,
  InvoiceWithLines,
} from './types'

const PG_UNIQUE_VIOLATION = '23505'

export class InvoicesRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  async fetchList({ organizationId, includeArchived }: InvoiceArgList): Promise<InvoiceWithLines[]> {
    const conditions = [eq(InvoicesSchema.organizationId, organizationId)]
    if (!includeArchived) conditions.push(eq(CounterpartiesSchema.archived, false))
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ invoice: InvoicesSchema })
        .from(InvoicesSchema)
        .innerJoin(CounterpartiesSchema, eq(CounterpartiesSchema.id, InvoicesSchema.counterpartyId))
        .where(and(...conditions))
        .orderBy(desc(InvoicesSchema.issueDate), desc(InvoicesSchema.id)),
    )
    const invoices = (rows ?? []).map((row) => row.invoice)
    return this.attachLines(invoices)
  }

  async fetchById(invoiceId: number): Promise<InvoiceWithLines | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle.select().from(InvoicesSchema).where(eq(InvoicesSchema.id, invoiceId)),
    )
    const invoice = result?.[0]
    if (!invoice) return null
    return (await this.attachLines([invoice]))[0]
  }

  async fetchOrganizationId(invoiceId: number): Promise<number | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ organizationId: InvoicesSchema.organizationId })
        .from(InvoicesSchema)
        .where(eq(InvoicesSchema.id, invoiceId)),
    )
    return result?.[0]?.organizationId ?? null
  }

  async fetchGoal(goalId: number): Promise<{ organizationId: number | null; name: string | null } | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ organizationId: GoalsSchema.organizationId, name: GoalsSchema.name })
        .from(GoalsSchema)
        .where(eq(GoalsSchema.id, goalId)),
    )
    return result?.[0] ?? null
  }

  private invoiceColumns(data: InvoiceArgUpdate) {
    return {
      goalId: data.goalId,
      sellerId: data.sellerId,
      counterpartyId: data.counterpartyId,
      number: data.number,
      reference: data.reference,
      currencyCode: data.currencyCode,
      issueDate: data.issueDate,
      paymentTerms: data.paymentTerms,
      dueDate: data.dueDate,
      periodFrom: data.periodFrom,
      periodTo: data.periodTo,
      discountType: data.discountType,
      discountValue: String(data.discountValue),
      taxRate: String(data.taxRate),
      taxExempt: data.taxExempt,
      taxNote: data.taxNote,
      notes: data.notes,
      terms: data.terms,
    }
  }

  async create({ data, createdBy, sellerSnapshot, counterpartySnapshot, goalName }: InvoiceCreateRepoArgs): Promise<InvoiceWithLines | 'duplicate_number' | null> {
    try {
      return await this.db.dbDrizzle.transaction(async (tx) => {
        const inserted = await tx
          .insert(InvoicesSchema)
          .values({
            organizationId: data.organizationId,
            ...this.invoiceColumns(data),
            goalName,
            sellerSnapshot,
            counterpartySnapshot,
            createdBy,
          })
          .returning()
        const created = inserted[0]
        const insertedLines = await tx.insert(InvoiceLinesSchema).values(this.toLineRows(created.id, data.lines)).returning()
        return { ...created, lines: insertedLines }
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) return 'duplicate_number'
      return null
    }
  }

  async update({ invoiceId, data, sellerSnapshot, counterpartySnapshot, goalName }: InvoiceUpdateRepoArgs): Promise<InvoiceWithLines | 'duplicate_number' | null> {
    try {
      return await this.db.dbDrizzle.transaction(async (tx) => {
        const updated = await tx
          .update(InvoicesSchema)
          .set({
            ...this.invoiceColumns(data),
            goalName,
            sellerSnapshot,
            counterpartySnapshot,
            updatedAt: new Date(),
          })
          .where(eq(InvoicesSchema.id, invoiceId))
          .returning()
        const current = updated[0]
        if (!current) return null
        await tx.delete(InvoiceLinesSchema).where(eq(InvoiceLinesSchema.invoiceId, invoiceId))
        const insertedLines = await tx.insert(InvoiceLinesSchema).values(this.toLineRows(invoiceId, data.lines)).returning()
        return { ...current, lines: insertedLines }
      })
    } catch (error) {
      if (this.isUniqueViolation(error)) return 'duplicate_number'
      return null
    }
  }

  async applyStatus({ invoiceId, patch }: InvoiceStatusRepoArgs): Promise<InvoiceWithLines | null> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .update(InvoicesSchema)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(InvoicesSchema.id, invoiceId))
        .returning(),
    )
    const invoice = result?.[0]
    if (!invoice) return null
    return (await this.attachLines([invoice]))[0]
  }

  async setReplaces({ invoiceId, replacesInvoiceId }: InvoiceSetReplacesArgs): Promise<void> {
    await callWithCatch(() =>
      this.db.dbDrizzle.update(InvoicesSchema).set({ replacesInvoiceId }).where(eq(InvoicesSchema.id, invoiceId)),
    )
  }

  async nextNumber({ organizationId, base }: InvoiceNextNumberArgs): Promise<string> {
    const match = base.match(/^(.*?)(\d+)$/)
    if (!match) return `${base}-1`
    const [, prefix, digits] = match
    const rows = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ number: InvoicesSchema.number })
        .from(InvoicesSchema)
        .where(eq(InvoicesSchema.organizationId, organizationId)),
    )
    let max = Number(digits)
    for (const row of rows ?? []) {
      if (!row.number.startsWith(prefix)) continue
      const tail = row.number.slice(prefix.length)
      if (/^\d+$/.test(tail)) max = Math.max(max, Number(tail))
    }
    return `${prefix}${String(max + 1).padStart(digits.length, '0')}`
  }

  async delete(invoiceId: number): Promise<boolean> {
    const result = await callWithCatch(() => this.db.dbDrizzle.delete(InvoicesSchema).where(eq(InvoicesSchema.id, invoiceId)))
    return !!result?.rowCount
  }

  private toLineRows(invoiceId: number, lines: InvoiceLineArg[]) {
    return lines.map((line, index) => ({
      invoiceId,
      position: index,
      taskId: line.taskId,
      description: line.description,
      unit: line.unit,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
    }))
  }

  private async attachLines(invoices: InvoicesSchemaTypeForSelect[]): Promise<InvoiceWithLines[]> {
    if (invoices.length === 0) return []
    const lines = await callWithCatch(() =>
      this.db.dbDrizzle
        .select()
        .from(InvoiceLinesSchema)
        .where(inArray(InvoiceLinesSchema.invoiceId, invoices.map((invoice) => invoice.id)))
        .orderBy(asc(InvoiceLinesSchema.invoiceId), asc(InvoiceLinesSchema.position)),
    )
    const byInvoice = new Map<number, InvoiceLinesSchemaTypeForSelect[]>()
    for (const line of lines ?? []) {
      const list = byInvoice.get(line.invoiceId) ?? []
      list.push(line)
      byInvoice.set(line.invoiceId, list)
    }
    return invoices.map((invoice) => ({ ...invoice, lines: byInvoice.get(invoice.id) ?? [] }))
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false
    const { code, cause } = error as { code?: string; cause?: { code?: string } }
    return code === PG_UNIQUE_VIOLATION || cause?.code === PG_UNIQUE_VIOLATION
  }
}
