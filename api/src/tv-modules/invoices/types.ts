import { type } from 'arktype'
import type {
  InvoiceCounterpartySnapshot,
  InvoiceLinesSchemaTypeForSelect,
  InvoiceSellerSnapshot,
  InvoiceStatus,
  InvoicesSchemaTypeForSelect,
} from 'taskview-db-schemas'
import type { InvoiceTotalsResult } from '../../utils/invoiceTotals'

const NumberFromString = type('string|number').pipe((v) => Number(v))
const BooleanFromString = type('string|boolean|undefined').pipe((v) => {
  if (v === undefined) return undefined
  if (typeof v === 'boolean') return v
  return v === 'true' || v === '1'
})
const DateString = type(/^\d{4}-\d{2}-\d{2}$/)
const DateStringOrNull = DateString.or('null')

export const InvoiceLineArkType = type({
  taskId: 'number|null',
  description: '1<=string<=1000',
  unit: "'service' | 'hours' | 'pcs'",
  quantity: 'number>=0',
  unitPrice: 'number>=0',
})
export type InvoiceLineArg = typeof InvoiceLineArkType.infer

export const InvoiceArkTypeCreate = type({
  organizationId: 'number',
  goalId: 'number|null',
  sellerId: 'number',
  counterpartyId: 'number',
  number: '1<=string<=50',
  reference: 'string<=200',
  currencyCode: /^[A-Z]{3}$/,
  issueDate: DateString,
  paymentTerms: "'on_receipt' | 'net7' | 'net14' | 'net30' | 'custom'",
  dueDate: DateStringOrNull,
  periodFrom: DateStringOrNull,
  periodTo: DateStringOrNull,
  discountType: "'percent' | 'amount'",
  discountValue: 'number>=0',
  taxRate: '0<=number<=100',
  taxExempt: 'boolean',
  taxNote: 'string<=500',
  notes: 'string<=2000',
  terms: 'string<=2000',
  lines: InvoiceLineArkType.array().atLeastLength(1),
})
export type InvoiceArgCreate = typeof InvoiceArkTypeCreate.infer

export const InvoiceArkTypeUpdate = InvoiceArkTypeCreate.omit('organizationId')
export type InvoiceArgUpdate = typeof InvoiceArkTypeUpdate.infer

export const InvoiceArkTypeList = type({
  organizationId: NumberFromString,
  'includeArchived?': BooleanFromString,
})
export type InvoiceArgList = typeof InvoiceArkTypeList.infer

export const InvoiceArkTypeId = type({
  id: NumberFromString,
})

export const InvoiceArkTypeStatus = type({
  status: "'draft' | 'issued' | 'paid' | 'void'",
})
export type InvoiceArgStatus = typeof InvoiceArkTypeStatus.infer

export const InvoiceArkTypePdf = type({
  id: NumberFromString,
  'lang?': "'en' | 'ru'",
})
export type InvoiceArgPdf = typeof InvoiceArkTypePdf.infer

export const INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['issued'],
  issued: ['paid', 'void'],
  paid: ['issued'],
  void: [],
}

export const INVOICE_TEMPLATE_VERSION = 1

export type InvoiceMissingRequisite =
  | 'seller.name'
  | 'seller.address'
  | 'seller.bank'
  | 'counterparty.name'
  | 'counterparty.address'
  | 'lines'

export type InvoiceStatusPatch = {
  status: InvoiceStatus
  issuedAt?: Date | null
  paidAt?: Date | null
  voidedAt?: Date | null
  templateVersion?: number
  subtotal?: string | null
  discountAmount?: string | null
  taxAmount?: string | null
  total?: string | null
}

export type InvoiceStatusRepoArgs = {
  invoiceId: number
  patch: InvoiceStatusPatch
}

export type InvoiceSetReplacesArgs = {
  invoiceId: number
  replacesInvoiceId: number
}

export type InvoiceReissueArgs = {
  invoiceId: number
  createdBy: number | null
}

export type InvoiceTransitionError =
  | { error: 'not_found' }
  | { error: 'invalid_transition'; from: InvoiceStatus; to: InvoiceStatus }
  | { error: 'missing_requisites'; missing: InvoiceMissingRequisite[] }

export type InvoiceTransitionResult = { invoice: InvoiceForClient } | InvoiceTransitionError

export type InvoicePdfLang = 'en' | 'ru'

export type InvoiceRenderPdfArgs = {
  invoiceId: number
  lang: InvoicePdfLang
}

export type PdfmakeServer = {
  virtualfs: { writeFileSync(filename: string, content: Buffer): void }
  setFonts(fonts: Record<string, { normal: string; bold: string; italics: string; bolditalics: string }>): void
  createPdf(docDefinition: unknown): { getBuffer(): Promise<Buffer> }
}

export type InvoiceSnapshots = {
  sellerSnapshot: InvoiceSellerSnapshot
  counterpartySnapshot: InvoiceCounterpartySnapshot
  goalName: string
}

export type InvoiceCreateRepoArgs = InvoiceSnapshots & {
  data: InvoiceArgCreate
  createdBy: number | null
}

export type InvoiceUpdateRepoArgs = InvoiceSnapshots & {
  invoiceId: number
  data: InvoiceArgUpdate
}

export type InvoiceCreateArgs = {
  data: InvoiceArgCreate
  createdBy: number | null
}

export type InvoiceUpdateArgs = {
  invoiceId: number
  data: InvoiceArgUpdate
}

export type InvoiceSetStatusArgs = {
  invoiceId: number
  status: InvoiceArgStatus['status']
}

export type InvoiceWithLines = InvoicesSchemaTypeForSelect & {
  lines: InvoiceLinesSchemaTypeForSelect[]
}

export type InvoiceLineForClient = Omit<InvoiceLinesSchemaTypeForSelect, 'invoiceId' | 'position' | 'quantity' | 'unitPrice'> & {
  quantity: number
  unitPrice: number
}

export type InvoiceForClient = Omit<
  InvoicesSchemaTypeForSelect,
  'discountValue' | 'taxRate' | 'sellerSnapshot' | 'counterpartySnapshot' | 'subtotal' | 'discountAmount' | 'taxAmount' | 'total'
> & {
  discountValue: number
  taxRate: number
  seller: InvoiceSellerSnapshot
  counterparty: InvoiceCounterpartySnapshot
  lines: InvoiceLineForClient[]
  totals: InvoiceTotalsResult
  totalsFrozen: boolean
}

export type InvoiceWriteError = 'seller_not_found' | 'counterparty_not_found' | 'goal_not_found' | 'duplicate_number' | 'not_found' | 'not_draft'

export type InvoiceWriteResult = { invoice: InvoiceForClient } | { error: InvoiceWriteError }

export type InvoiceDeleteResult = 'deleted' | 'not_draft' | 'not_found'

export type InvoiceNextNumberArgs = {
  organizationId: number
  base: string
}
