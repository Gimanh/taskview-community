import type { BillingBankDetails, BillingRequisite, CounterpartyKind } from './billing.types'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void'
export type InvoiceUnit = 'service' | 'hours' | 'pcs'
export type InvoiceDiscountType = 'percent' | 'amount'
export type InvoicePaymentTerms = 'on_receipt' | 'net7' | 'net14' | 'net30' | 'custom'

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
    kind: CounterpartyKind
    name: string
    legalName: string
    address: string
    email: string
    phone: string
    contactPerson: string
    requisites: BillingRequisite[]
}

export type InvoiceLineItem = {
    id: number
    taskId: number | null
    description: string
    unit: InvoiceUnit
    quantity: number
    unitPrice: number
}

export type InvoiceLineArg = Omit<InvoiceLineItem, 'id'>

export type InvoiceTotals = {
    subtotal: number
    discount: number
    taxable: number
    tax: number
    total: number
}

export type InvoiceMissingRequisite =
    | 'seller.name'
    | 'seller.address'
    | 'seller.bank'
    | 'counterparty.name'
    | 'counterparty.address'
    | 'lines'

export type InvoiceTransitionError =
    | { error: 'not_found' }
    | { error: 'invalid_transition'; from: InvoiceStatus; to: InvoiceStatus }
    | { error: 'missing_requisites'; missing: InvoiceMissingRequisite[] }

export type InvoicePdfLang = 'en' | 'ru'

export type InvoiceArgPdf = {
    id: number
    lang: InvoicePdfLang
}

export type InvoiceItem = {
    id: number
    organizationId: number
    goalId: number | null
    goalName: string
    sellerId: number
    counterpartyId: number
    number: string
    status: InvoiceStatus
    reference: string
    currencyCode: string
    issueDate: string
    paymentTerms: InvoicePaymentTerms
    dueDate: string | null
    periodFrom: string | null
    periodTo: string | null
    discountType: InvoiceDiscountType
    discountValue: number
    taxRate: number
    taxExempt: boolean
    taxNote: string
    notes: string
    terms: string
    seller: InvoiceSellerSnapshot
    counterparty: InvoiceCounterpartySnapshot
    lines: InvoiceLineItem[]
    totals: InvoiceTotals
    totalsFrozen: boolean
    issuedAt: string | null
    paidAt: string | null
    voidedAt: string | null
    replacesInvoiceId: number | null
    templateVersion: number
    createdBy: number | null
    createdAt: string
    updatedAt: string
}

export type InvoiceArgCreate = Omit<
    InvoiceItem,
    | 'id' | 'goalName' | 'status' | 'seller' | 'counterparty' | 'lines' | 'createdBy' | 'createdAt' | 'updatedAt'
    | 'totals' | 'totalsFrozen' | 'issuedAt' | 'paidAt' | 'voidedAt' | 'replacesInvoiceId' | 'templateVersion'
> & {
    lines: InvoiceLineArg[]
}

export type InvoiceArgUpdate = {
    id: number
    data: Omit<InvoiceArgCreate, 'organizationId'>
}

export type InvoiceArgList = {
    organizationId: number
    includeArchived?: boolean
}

export type InvoiceArgStatus = {
    id: number
    status: InvoiceStatus
}
