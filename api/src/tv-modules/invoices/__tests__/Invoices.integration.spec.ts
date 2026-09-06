import axios from 'axios'
import type http from 'http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import App from '../../../App'

const port = 1811
const api = axios.create({ baseURL: `http://localhost:${port}`, validateStatus: () => true })

const LOGIN = 'test@mail.dest'
const PASSWORD = 'user1!#Q'

let server: http.Server
let jwt = ''
let organizationId = 0
let goalId = 0
let sellerId = 0
let counterpartyId = 0
let invoiceId = 0

const auth = () => ({ headers: { Authorization: `Bearer ${jwt}` } })

const sellerPayload = () => ({
  organizationId,
  name: 'IT Seller',
  legalName: 'IT Seller LLC',
  address: 'Somewhere 1',
  email: 'billing@seller.test',
  phone: '',
  logoUrl: '',
  currencyCode: 'EUR',
  bank: { bankName: 'Bank', accountNumber: '123', iban: 'DE00', swift: 'XXX', correspondentAccount: '' },
  requisites: [{ key: 'vat', label: 'VAT ID', value: 'DE1' }],
  defaultTerms: 'Net 14',
  taxNote: '',
})

const counterpartyPayload = () => ({
  organizationId,
  kind: 'organization',
  name: 'IT Client',
  legalName: 'IT Client GmbH',
  address: '',
  email: 'ap@client.test',
  phone: '',
  contactPerson: 'Anna',
  requisites: [],
})

const invoicePayload = (number: string) => ({
  organizationId,
  goalId,
  sellerId,
  counterpartyId,
  number,
  reference: 'PO-1',
  currencyCode: 'EUR',
  issueDate: '2026-09-01',
  paymentTerms: 'net14',
  dueDate: '2026-09-15',
  periodFrom: null,
  periodTo: null,
  discountType: 'percent',
  discountValue: 10,
  taxRate: 19,
  taxExempt: false,
  taxNote: '',
  notes: '',
  terms: 'Net 14',
  lines: [
    { taskId: null, description: 'Design', unit: 'service', quantity: 1, unitPrice: 1000 },
    { taskId: null, description: 'Dev', unit: 'hours', quantity: 10.5, unitPrice: 80 },
  ],
})

describe('billing and invoices', () => {
  vi.mock('emailjs', () => ({
    SMTPClient: vi.fn().mockImplementation(() => ({ sendAsync: vi.fn().mockResolvedValue(true) })),
  }))

  beforeAll(async () => {
    server = new App(port).listen()
    const login = await api.post('/module/auth/login', { login: LOGIN, password: PASSWORD })
    expect(login.status).toBe(200)
    jwt = login.data.access

    const org = await api.post('/module/organizations', { name: `billing-it-${Date.now()}` }, auth())
    expect(org.status).toBe(200)
    organizationId = org.data.response.id

    const goal = await api.post('/module/goals', { name: 'billing-it-goal', organizationId }, auth())
    expect(goal.status).toBe(200)
    goalId = goal.data.response.id ?? goal.data.response.goal?.id
  })

  afterAll(async () => {
    if (organizationId) await api.delete(`/module/organizations/${organizationId}`, auth())
    server?.close()
  })

  it('lists the seeded currencies', async () => {
    const response = await api.get('/module/billing/currencies', auth())
    expect(response.status).toBe(200)
    expect(response.data.response.length).toBeGreaterThanOrEqual(20)
    expect(response.data.response.find((c: { code: string }) => c.code === 'JPY').decimalDigits).toBe(0)
  })

  it('creates a seller and a counterparty for the organization', async () => {
    const seller = await api.post('/module/billing/sellers', sellerPayload(), auth())
    expect(seller.status).toBe(200)
    sellerId = seller.data.response.id
    expect(seller.data.response.bank.iban).toBe('DE00')

    const counterparty = await api.post('/module/billing/counterparties', counterpartyPayload(), auth())
    expect(counterparty.status).toBe(200)
    counterpartyId = counterparty.data.response.id

    const list = await api.get('/module/billing/counterparties', { params: { organizationId }, ...auth() })
    expect(list.data.response.map((c: { id: number }) => c.id)).toContain(counterpartyId)
  })

  it('rejects an invalid payload', async () => {
    const response = await api.post('/module/billing/sellers', { ...sellerPayload(), currencyCode: 'euro' }, auth())
    expect(response.status).toBe(400)
  })

  it('creates an invoice with snapshots, lines and the project name', async () => {
    const response = await api.post('/module/invoices', invoicePayload('INV-IT-1'), auth())
    expect(response.status).toBe(200)
    const invoice = response.data.response
    invoiceId = invoice.id
    expect(invoice.status).toBe('draft')
    expect(invoice.goalName).toBe('billing-it-goal')
    expect(invoice.seller.legalName).toBe('IT Seller LLC')
    expect(invoice.counterparty.contactPerson).toBe('Anna')
    expect(invoice.lines).toHaveLength(2)
    expect(invoice.lines[1].quantity).toBe(10.5)
    expect(invoice.discountValue).toBe(10)
    expect(typeof invoice.taxRate).toBe('number')
  })

  it('refuses a duplicate number inside the organization', async () => {
    const response = await api.post('/module/invoices', invoicePayload('INV-IT-1'), auth())
    expect(response.status).toBe(409)
  })

  it('refuses a seller from another organization', async () => {
    const response = await api.post('/module/invoices', { ...invoicePayload('INV-IT-2'), sellerId: 999999 }, auth())
    expect(response.status).toBe(422)
  })

  it('keeps the seller snapshot when the seller is edited', async () => {
    const update = await api.patch(`/module/billing/sellers/${sellerId}`, { ...sellerPayload(), organizationId: undefined, legalName: 'Renamed LLC' }, auth())
    expect(update.status).toBe(200)
    const invoice = await api.get(`/module/invoices/${invoiceId}`, auth())
    expect(invoice.data.response.seller.legalName).toBe('IT Seller LLC')
  })

  it('replaces lines on update', async () => {
    const data = { ...invoicePayload('INV-IT-1'), organizationId: undefined, lines: [{ taskId: null, description: 'Only', unit: 'pcs', quantity: 2, unitPrice: 5 }] }
    const response = await api.patch(`/module/invoices/${invoiceId}`, data, auth())
    expect(response.status).toBe(200)
    expect(response.data.response.lines).toHaveLength(1)
    expect(response.data.response.lines[0].description).toBe('Only')
  })

  it('refuses to delete a seller that has invoices', async () => {
    const response = await api.delete(`/module/billing/sellers/${sellerId}`, auth())
    expect(response.status).toBe(409)
  })

  it('hides invoices of an archived client unless asked for', async () => {
    const archive = await api.patch(`/module/billing/counterparties/${counterpartyId}/archive`, { archived: true }, auth())
    expect(archive.status).toBe(200)
    expect(archive.data.response.archived).toBe(true)

    const hidden = await api.get('/module/invoices', { params: { organizationId }, ...auth() })
    expect(hidden.data.response.map((i: { id: number }) => i.id)).not.toContain(invoiceId)

    const shown = await api.get('/module/invoices', { params: { organizationId, includeArchived: true }, ...auth() })
    expect(shown.data.response.map((i: { id: number }) => i.id)).toContain(invoiceId)

    await api.patch(`/module/billing/counterparties/${counterpartyId}/archive`, { archived: false }, auth())
  })

  it('refuses to pay a draft and reports what is missing before issuing', async () => {
    const paid = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'paid' }, auth())
    expect(paid.status).toBe(409)
    expect(paid.data.error).toBe('invalid_transition')

    const issued = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' }, auth())
    expect(issued.status).toBe(422)
    expect(issued.data.missing).toContain('counterparty.address')
  })

  it('issues the invoice, freezes the totals and locks editing', async () => {
    const fixed = await api.patch(`/module/billing/counterparties/${counterpartyId}`, { ...counterpartyPayload(), organizationId: undefined, address: 'Client street 1' }, auth())
    expect(fixed.status).toBe(200)
    const resnap = await api.patch(`/module/invoices/${invoiceId}`, { ...invoicePayload('INV-IT-1'), organizationId: undefined }, auth())
    expect(resnap.status).toBe(200)

    const issued = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' }, auth())
    expect(issued.status).toBe(200)
    expect(issued.data.response.status).toBe('issued')
    expect(issued.data.response.issuedAt).toBeTruthy()
    expect(issued.data.response.totalsFrozen).toBe(true)
    expect(issued.data.response.totals.total).toBe(1970.64)

    const edit = await api.patch(`/module/invoices/${invoiceId}`, { ...invoicePayload('INV-IT-1'), organizationId: undefined }, auth())
    expect(edit.status).toBe(409)
    const del = await api.delete(`/module/invoices/${invoiceId}`, auth())
    expect(del.status).toBe(409)
    const back = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'draft' }, auth())
    expect(back.status).toBe(409)
  })

  it('marks paid, unmarks and refuses to void a paid invoice', async () => {
    const paid = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'paid' }, auth())
    expect(paid.data.response.paidAt).toBeTruthy()
    const voided = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'void' }, auth())
    expect(voided.status).toBe(409)
    const unpaid = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' }, auth())
    expect(unpaid.data.response.paidAt).toBeNull()
  })

  it('renders the invoice as a PDF', async () => {
    const response = await api.get(`/module/invoices/${invoiceId}/pdf`, { ...auth(), params: { lang: 'ru' }, responseType: 'arraybuffer' })
    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
    expect(Buffer.from(response.data).subarray(0, 4).toString()).toBe('%PDF')
  })

  it('reissues: voids the original and creates a draft copy with the next number', async () => {
    const response = await api.post(`/module/invoices/${invoiceId}/reissue`, {}, auth())
    expect(response.status).toBe(200)
    const copy = response.data.response
    expect(copy.status).toBe('draft')
    expect(copy.number).toBe('INV-IT-2')
    expect(copy.replacesInvoiceId).toBe(invoiceId)
    expect(copy.lines).toHaveLength(2)

    const original = await api.get(`/module/invoices/${invoiceId}`, auth())
    expect(original.data.response.status).toBe('void')
    expect(original.data.response.voidedAt).toBeTruthy()

    const revive = await api.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' }, auth())
    expect(revive.status).toBe(409)
    const deleted = await api.delete(`/module/invoices/${copy.id}`, auth())
    expect(deleted.status).toBe(200)
  })

  it('keeps a seller with a voided invoice undeletable', async () => {
    const response = await api.delete(`/module/billing/sellers/${sellerId}`, auth())
    expect(response.status).toBe(409)
  })

  it('rejects an anonymous request', async () => {
    const response = await api.get('/module/invoices', { params: { organizationId } })
    expect(response.status).toBe(401)
  })
})
