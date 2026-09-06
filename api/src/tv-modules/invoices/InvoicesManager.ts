import type {
  CounterpartiesSchemaTypeForSelect,
  InvoiceCounterpartySnapshot,
  InvoiceSellerSnapshot,
  InvoiceStatus,
  SellersSchemaTypeForSelect,
} from 'taskview-db-schemas'
import { BillingRepository } from '../billing/BillingRepository'
import { computeInvoiceTotals } from '../../utils/invoiceTotals'
import { InvoicePdfRenderer } from './InvoicePdfRenderer'
import { InvoicesRepository } from './InvoicesRepository'
import {
  INVOICE_TEMPLATE_VERSION,
  INVOICE_TRANSITIONS,
  type InvoiceArgList,
  type InvoiceArgUpdate,
  type InvoiceCreateArgs,
  type InvoiceDeleteResult,
  type InvoiceForClient,
  type InvoiceMissingRequisite,
  type InvoiceReissueArgs,
  type InvoiceRenderPdfArgs,
  type InvoiceSetStatusArgs,
  type InvoiceSnapshots,
  type InvoiceStatusPatch,
  type InvoiceTransitionResult,
  type InvoiceUpdateArgs,
  type InvoiceWithLines,
  type InvoiceWriteError,
  type InvoiceWriteResult,
} from './types'

export class InvoicesManager {
  public readonly repository: InvoicesRepository
  private readonly billing: BillingRepository
  private readonly pdf: InvoicePdfRenderer

  constructor() {
    this.repository = new InvoicesRepository()
    this.billing = new BillingRepository()
    this.pdf = new InvoicePdfRenderer()
  }

  async fetchList(args: InvoiceArgList): Promise<InvoiceForClient[]> {
    return (await this.repository.fetchList(args)).map((invoice) => this.toClient(invoice))
  }

  async fetchById(invoiceId: number): Promise<InvoiceForClient | null> {
    const invoice = await this.repository.fetchById(invoiceId)
    return invoice ? this.toClient(invoice) : null
  }

  async create({ data, createdBy }: InvoiceCreateArgs): Promise<InvoiceWriteResult> {
    const snapshots = await this.resolveSnapshots(data.organizationId, data)
    if (typeof snapshots === 'string') return { error: snapshots }
    const created = await this.repository.create({ data, createdBy, ...snapshots })
    return this.toWriteResult(created)
  }

  async update({ invoiceId, data }: InvoiceUpdateArgs): Promise<InvoiceWriteResult> {
    const existing = await this.repository.fetchById(invoiceId)
    if (!existing) return { error: 'not_found' }
    if (existing.status !== 'draft') return { error: 'not_draft' }
    const snapshots = await this.resolveSnapshots(existing.organizationId, data)
    if (typeof snapshots === 'string') return { error: snapshots }
    const updated = await this.repository.update({ invoiceId, data, ...snapshots })
    return this.toWriteResult(updated)
  }

  async transition({ invoiceId, status }: InvoiceSetStatusArgs): Promise<InvoiceTransitionResult> {
    const existing = await this.repository.fetchById(invoiceId)
    if (!existing) return { error: 'not_found' }
    if (!INVOICE_TRANSITIONS[existing.status].includes(status)) {
      return { error: 'invalid_transition', from: existing.status, to: status }
    }

    const patch: InvoiceStatusPatch = { status }
    if (status === 'issued' && existing.status === 'draft') {
      const missing = this.missingRequisites(existing)
      if (missing.length > 0) return { error: 'missing_requisites', missing }
      const totals = computeInvoiceTotals(existing)
      patch.issuedAt = new Date()
      patch.templateVersion = INVOICE_TEMPLATE_VERSION
      patch.subtotal = String(totals.subtotal)
      patch.discountAmount = String(totals.discount)
      patch.taxAmount = String(totals.tax)
      patch.total = String(totals.total)
    }
    if (status === 'issued' && existing.status === 'paid') patch.paidAt = null
    if (status === 'paid') patch.paidAt = new Date()
    if (status === 'void') patch.voidedAt = new Date()

    const updated = await this.repository.applyStatus({ invoiceId, patch })
    return updated ? { invoice: this.toClient(updated) } : { error: 'not_found' }
  }

  async reissue({ invoiceId, createdBy }: InvoiceReissueArgs): Promise<InvoiceTransitionResult> {
    const original = await this.repository.fetchById(invoiceId)
    if (!original) return { error: 'not_found' }
    if (original.status === 'issued') {
      const voided = await this.transition({ invoiceId, status: 'void' })
      if ('error' in voided) return voided
    } else if (original.status !== 'void') {
      return { error: 'invalid_transition', from: original.status, to: 'void' }
    }

    const number = await this.repository.nextNumber({ organizationId: original.organizationId, base: original.number })
    const created = await this.repository.create({
      createdBy,
      sellerSnapshot: original.sellerSnapshot,
      counterpartySnapshot: original.counterpartySnapshot,
      goalName: original.goalName,
      data: {
        organizationId: original.organizationId,
        goalId: original.goalId,
        sellerId: original.sellerId,
        counterpartyId: original.counterpartyId,
        number,
        reference: original.reference,
        currencyCode: original.currencyCode,
        issueDate: new Date().toISOString().slice(0, 10),
        paymentTerms: original.paymentTerms,
        dueDate: original.dueDate,
        periodFrom: original.periodFrom,
        periodTo: original.periodTo,
        discountType: original.discountType,
        discountValue: Number(original.discountValue),
        taxRate: Number(original.taxRate),
        taxExempt: original.taxExempt,
        taxNote: original.taxNote,
        notes: original.notes,
        terms: original.terms,
        lines: original.lines.map((line) => ({
          taskId: line.taskId,
          description: line.description,
          unit: line.unit,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
        })),
      },
    })
    if (!created || created === 'duplicate_number') return { error: 'not_found' }
    await this.repository.setReplaces({ invoiceId: created.id, replacesInvoiceId: original.id })
    return { invoice: this.toClient({ ...created, replacesInvoiceId: original.id }) }
  }

  async delete(invoiceId: number): Promise<InvoiceDeleteResult> {
    const existing = await this.repository.fetchById(invoiceId)
    if (!existing) return 'not_found'
    if (existing.status !== 'draft') return 'not_draft'
    return (await this.repository.delete(invoiceId)) ? 'deleted' : 'not_found'
  }

  async renderPdf({ invoiceId, lang }: InvoiceRenderPdfArgs): Promise<Buffer | null> {
    const invoice = await this.fetchById(invoiceId)
    if (!invoice) return null
    return this.pdf.render(invoice, lang)
  }

  private missingRequisites(invoice: InvoiceWithLines): InvoiceMissingRequisite[] {
    const seller = invoice.sellerSnapshot
    const counterparty = invoice.counterpartySnapshot
    const missing: InvoiceMissingRequisite[] = []
    if (!seller.name.trim() && !seller.legalName.trim()) missing.push('seller.name')
    if (!seller.address.trim()) missing.push('seller.address')
    if (!seller.bank.accountNumber.trim() && !seller.bank.iban.trim()) missing.push('seller.bank')
    if (!counterparty.name.trim() && !counterparty.legalName.trim()) missing.push('counterparty.name')
    if (!counterparty.address.trim()) missing.push('counterparty.address')
    if (invoice.lines.length === 0) missing.push('lines')
    return missing
  }

  private async resolveSnapshots(organizationId: number, data: InvoiceArgUpdate): Promise<InvoiceSnapshots | InvoiceWriteError> {
    const seller = await this.billing.fetchSellerById(data.sellerId)
    if (!seller || seller.organizationId !== organizationId) return 'seller_not_found'
    const counterparty = await this.billing.fetchCounterpartyById(data.counterpartyId)
    if (!counterparty || counterparty.organizationId !== organizationId) return 'counterparty_not_found'
    let goalName = ''
    if (data.goalId !== null) {
      const goal = await this.repository.fetchGoal(data.goalId)
      if (!goal || goal.organizationId !== organizationId) return 'goal_not_found'
      goalName = goal.name ?? ''
    }
    return {
      sellerSnapshot: this.snapshotSeller(seller),
      counterpartySnapshot: this.snapshotCounterparty(counterparty),
      goalName,
    }
  }

  private snapshotSeller(seller: SellersSchemaTypeForSelect): InvoiceSellerSnapshot {
    return {
      name: seller.name,
      legalName: seller.legalName,
      address: seller.address,
      email: seller.email,
      phone: seller.phone,
      logoUrl: seller.logoUrl,
      bank: seller.bank,
      requisites: seller.requisites,
    }
  }

  private snapshotCounterparty(counterparty: CounterpartiesSchemaTypeForSelect): InvoiceCounterpartySnapshot {
    return {
      kind: counterparty.kind,
      name: counterparty.name,
      legalName: counterparty.legalName,
      address: counterparty.address,
      email: counterparty.email,
      phone: counterparty.phone,
      contactPerson: counterparty.contactPerson,
      requisites: counterparty.requisites,
    }
  }

  private toWriteResult(result: InvoiceWithLines | 'duplicate_number' | null): InvoiceWriteResult {
    if (result === 'duplicate_number') return { error: 'duplicate_number' }
    if (!result) return { error: 'not_found' }
    return { invoice: this.toClient(result) }
  }

  private toClient(invoice: InvoiceWithLines): InvoiceForClient {
    const { sellerSnapshot, counterpartySnapshot, lines, subtotal, discountAmount, taxAmount, total, ...rest } = invoice
    const totalsFrozen = total !== null
    const totals = totalsFrozen
      ? {
          subtotal: Number(subtotal),
          discount: Number(discountAmount),
          taxable: Number(subtotal) - Number(discountAmount),
          tax: Number(taxAmount),
          total: Number(total),
        }
      : computeInvoiceTotals(invoice)
    return {
      ...rest,
      discountValue: Number(invoice.discountValue),
      taxRate: Number(invoice.taxRate),
      seller: sellerSnapshot,
      counterparty: counterpartySnapshot,
      totals,
      totalsFrozen,
      lines: lines.map((line) => ({
        id: line.id,
        taskId: line.taskId,
        description: line.description,
        unit: line.unit,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      })),
    }
  }
}

export type { InvoiceStatus }
