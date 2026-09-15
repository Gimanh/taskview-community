import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import type { InvoiceArgCreate, InvoiceItem, InvoicePdfLang, InvoiceTransitionError } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { httpStatusOf } from '@/helpers/billingErrors'
import type {
  CreateInvoiceArgs,
  InvoiceFormValue,
  InvoiceSaveResult,
  InvoiceTransitionResult,
  InvoicesStoreState,
  TransitionInvoiceArgs,
  UpdateInvoiceArgs,
} from '@/types/invoices.types'

export const useInvoicesStore = defineStore('invoices', {
  state: (): InvoicesStoreState => ({
    invoices: [],
    loading: false,
    includeArchived: false,
  }),

  getters: {
    byId: (state) => (invoiceId: number) => state.invoices.find((invoice) => invoice.id === invoiceId) ?? null,

    lastCounterpartyForGoal: (state) => (goalId: number) =>
      state.invoices.find((invoice) => invoice.goalId === goalId)?.counterpartyId ?? null,

    suggestedNumber: (state) => () =>
      `INV-${new Date().getFullYear()}-${String(state.invoices.length + 1).padStart(4, '0')}`,
  },

  actions: {
    async fetch(organizationId: number) {
      this.loading = true
      const result = await $tvApi.invoices
        .fetch({ organizationId, includeArchived: this.includeArchived })
        .catch(logError)
        .finally(() => { this.loading = false })
      if (result) this.invoices = result
    },

    async fetchById(invoiceId: number): Promise<InvoiceItem | null> {
      const invoice = await $tvApi.invoices.fetchById(invoiceId).catch(logError)
      if (!invoice) return null
      this.replace(invoice)
      return invoice
    },

    toPayload(value: InvoiceFormValue): Omit<InvoiceArgCreate, 'organizationId'> {
      return {
        goalId: value.goalId,
        sellerId: value.sellerId as number,
        counterpartyId: value.counterpartyId as number,
        number: value.number.trim(),
        reference: value.reference.trim(),
        currencyCode: value.currencyCode,
        issueDate: value.issueDate as string,
        paymentTerms: value.paymentTerms,
        dueDate: value.dueDate,
        periodFrom: value.periodFrom,
        periodTo: value.periodTo,
        discountType: value.discountType,
        discountValue: value.discountValue,
        taxRate: value.taxRate,
        taxExempt: value.taxExempt,
        taxNote: value.taxNote.trim(),
        notes: value.notes.trim(),
        terms: value.terms.trim(),
        lines: value.lines.map((line) => ({
          taskId: line.taskId,
          description: line.description.trim(),
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      }
    },

    async createInvoice({ organizationId, value }: CreateInvoiceArgs): Promise<InvoiceSaveResult> {
      try {
        const invoice = await $tvApi.invoices.create({ organizationId, ...this.toPayload(value) })
        this.invoices.unshift(invoice)
        return { invoice }
      } catch (error) {
        logError(error)
        return { error: httpStatusOf(error) === 409 ? 'duplicate_number' : 'failed' }
      }
    },

    async updateInvoice({ invoiceId, value }: UpdateInvoiceArgs): Promise<InvoiceSaveResult> {
      try {
        const invoice = await $tvApi.invoices.update({ id: invoiceId, data: this.toPayload(value) })
        this.replace(invoice)
        return { invoice }
      } catch (error) {
        logError(error)
        const status = httpStatusOf(error)
        const body = isAxiosError(error) ? (error.response?.data as { error?: string } | undefined) : undefined
        if (status === 409 && body?.error === 'not_draft') return { error: 'not_draft' }
        return { error: status === 409 ? 'duplicate_number' : 'failed' }
      }
    },

    async transition({ invoiceId, status }: TransitionInvoiceArgs): Promise<InvoiceTransitionResult> {
      try {
        const invoice = await $tvApi.invoices.setStatus({ id: invoiceId, status })
        this.replace(invoice)
        return { invoice }
      } catch (error) {
        return this.toTransitionError(error)
      }
    },

    async reissue(invoiceId: number): Promise<InvoiceTransitionResult> {
      try {
        const copy = await $tvApi.invoices.reissue(invoiceId)
        this.replace(copy)
        await this.fetchById(invoiceId)
        return { invoice: copy }
      } catch (error) {
        return this.toTransitionError(error)
      }
    },

    async fetchPdf(invoiceId: number, lang: InvoicePdfLang): Promise<Blob | null> {
      return $tvApi.invoices.fetchPdf({ id: invoiceId, lang }).catch((error) => {
        logError(error)
        return null
      })
    },

    toTransitionError(error: unknown): InvoiceTransitionResult {
      logError(error)
      const body = isAxiosError(error) ? (error.response?.data as InvoiceTransitionError | undefined) : undefined
      return body && typeof body === 'object' && 'error' in body ? body : { error: 'failed' }
    },

    async deleteInvoice(invoiceId: number): Promise<boolean> {
      const result = await $tvApi.invoices.delete(invoiceId).catch(logError)
      if (!result) return false
      this.invoices = this.invoices.filter((invoice) => invoice.id !== invoiceId)
      return true
    },

    replace(invoice: InvoiceItem) {
      const index = this.invoices.findIndex((item) => item.id === invoice.id)
      if (index >= 0) this.invoices[index] = invoice
      else this.invoices.unshift(invoice)
    },
  },
})
