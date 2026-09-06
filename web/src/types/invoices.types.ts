import type {
  CounterpartyArgCreate,
  CounterpartyItem,
  InvoiceDiscountType,
  InvoiceItem,
  InvoiceLineItem,
  InvoicePaymentTerms,
  InvoiceStatus,
  InvoiceTransitionError,
  InvoiceUnit,
  SellerArgCreate,
  SellerItem,
} from 'taskview-api'

export type SellerFormValue = Omit<SellerArgCreate, 'organizationId'>

export type PartyFields = Pick<SellerFormValue, 'name' | 'legalName' | 'address' | 'email' | 'phone' | 'requisites'>
export type CounterpartyFormValue = Omit<CounterpartyArgCreate, 'organizationId'>

export type InvoiceFormLine = Omit<InvoiceLineItem, 'id'> & {
  key: string
}

export type InvoiceFormValue = {
  number: string
  reference: string
  goalId: number | null
  sellerId: number | null
  counterpartyId: number | null
  currencyCode: string
  issueDate: string | null
  paymentTerms: InvoicePaymentTerms
  dueDate: string | null
  periodFrom: string | null
  periodTo: string | null
  lines: InvoiceFormLine[]
  discountType: InvoiceDiscountType
  discountValue: number
  taxRate: number
  taxExempt: boolean
  taxNote: string
  notes: string
  terms: string
}

export type InvoiceTotals = {
  subtotal: number
  discount: number
  taxable: number
  tax: number
  total: number
}

export type ComputeTotalsArgs = {
  lines: Pick<InvoiceLineItem, 'quantity' | 'unitPrice'>[]
  discountType: InvoiceDiscountType
  discountValue: number
  taxRate: number
  taxExempt: boolean
}

export type InvoiceTaskOption = {
  id: number
  description: string
  amount: number
  complete: boolean
}

export type InvoiceSelectOption = {
  label: string
  value: number
}

export type FormatMoneyArgs = {
  amount: number
  currencyCode: string
  locale: string
}

export type AddDaysArgs = {
  date: string
  days: number
}

export type InvoicesStoreState = {
  invoices: InvoiceItem[]
  loading: boolean
  includeArchived: boolean
}

export type SellersStoreState = {
  sellers: SellerItem[]
  loading: boolean
  includeArchived: boolean
}

export type CounterpartiesStoreState = {
  counterparties: CounterpartyItem[]
  loading: boolean
  includeArchived: boolean
}

export type CurrenciesStoreState = {
  currencies: { code: string, symbol: string, decimalDigits: number }[]
  loaded: boolean
}

export type CreateInvoiceArgs = {
  organizationId: number
  value: InvoiceFormValue
}

export type UpdateInvoiceArgs = {
  invoiceId: number
  value: InvoiceFormValue
}

export type CreateSellerArgs = {
  organizationId: number
  value: SellerFormValue
}

export type UpdateSellerArgs = {
  sellerId: number
  value: SellerFormValue
}

export type CreateCounterpartyArgs = {
  organizationId: number
  value: CounterpartyFormValue
}

export type UpdateCounterpartyArgs = {
  counterpartyId: number
  value: CounterpartyFormValue
}

export type ArchiveArgs = {
  id: number
  archived: boolean
}

export type BillingDeleteResult = 'deleted' | 'in_use' | 'failed'
export type InvoiceSaveResult = { invoice: InvoiceItem } | { error: 'duplicate_number' | 'not_draft' | 'failed' }
export type InvoiceTransitionResult = { invoice: InvoiceItem } | InvoiceTransitionError | { error: 'failed' }

export type TransitionInvoiceArgs = {
  invoiceId: number
  status: InvoiceStatus
}

export const INVOICE_UNITS: InvoiceUnit[] = ['service', 'hours', 'pcs']

export const PAYMENT_TERMS_DAYS: Record<InvoicePaymentTerms, number | null> = {
  on_receipt: 0,
  net7: 7,
  net14: 14,
  net30: 30,
  custom: null,
}

export const REQUISITE_PRESETS = ['ИНН', 'КПП', 'ОГРН', 'VAT ID', 'EIN', 'Reg. No.']
