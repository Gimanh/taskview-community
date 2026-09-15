import { TvApi } from '@/tv'
import type { CounterpartyArgCreate, InvoiceArgCreate, SellerArgCreate } from '@/index'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import axios, { type AxiosInstance } from 'axios'
import { initApi, API_URL, DEFAULT_USER, DEFAULT_USER_2, DEFAULT_PASSWORD } from './init-api'
import { ymd } from './test-helpers'

/**
 * Billing (currencies, sellers, clients) and invoices end to end.
 *
 * `owner` (user1) owns organization A, `member` (user2) is a plain member of A
 * and the owner of organization B. Billing is an owner/admin surface, so the
 * member must be refused everywhere, and nobody may reach another
 * organization's records by id. The invoice lifecycle is checked transition by
 * transition: only the moves from the status matrix succeed, issuing freezes
 * the totals, editing stops after issue, and "correct" voids the original and
 * opens a replacement draft.
 */
describe('Billing and invoices', () => {
  let owner: TvApi
  let member: TvApi
  let ownerRaw: AxiosInstance
  let memberRaw: AxiosInstance
  let memberEmail: string
  let deleteAllGoals: () => Promise<void>

  let orgA = 0
  let orgB = 0
  let goalId = 0
  let sellerId = 0
  let counterpartyId = 0
  let foreignSellerId = 0
  let invoiceId = 0

  const rawClient = async (login: string) => {
    const auth = await axios.post(`${API_URL}/module/auth/login`, { login, password: DEFAULT_PASSWORD })
    return axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })
  }

  const sellerPayload = (organizationId: number): SellerArgCreate => ({
    organizationId,
    name: 'E2E Seller',
    legalName: 'E2E Seller LLC',
    address: '',
    email: 'billing@seller.e2e',
    phone: '',
    logoUrl: '',
    currencyCode: 'EUR',
    bank: { bankName: 'Bank', accountNumber: '', iban: '', swift: '', correspondentAccount: '' },
    requisites: [{ key: 'vat', label: 'VAT ID', value: 'DE000' }],
    defaultTerms: 'Net 14',
    taxNote: 'VAT not applicable',
  })

  const counterpartyPayload = (organizationId: number): CounterpartyArgCreate => ({
    organizationId,
    kind: 'organization',
    name: 'E2E Client',
    legalName: 'E2E Client GmbH',
    address: '',
    email: 'ap@client.e2e',
    phone: '',
    contactPerson: 'Anna',
    requisites: [],
  })

  const invoicePayload = (number: string): InvoiceArgCreate => ({
    organizationId: orgA,
    goalId,
    sellerId,
    counterpartyId,
    number,
    reference: 'PO-1',
    currencyCode: 'EUR',
    issueDate: ymd(0),
    paymentTerms: 'net14',
    dueDate: ymd(14),
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
      { taskId: null, description: 'Development', unit: 'hours', quantity: 10.5, unitPrice: 80 },
    ],
  })

  beforeAll(async () => {
    const init = await initApi()
    owner = init.$tvApi
    member = init.$tvApiForSecondUser
    memberEmail = init.user2Email
    deleteAllGoals = init.deleteAllGoals
    ownerRaw = await rawClient(DEFAULT_USER)
    memberRaw = await rawClient(DEFAULT_USER_2)

    const a = await owner.organizations.create({ name: `billing-e2e-A-${Date.now()}` })
    if (!a) throw new Error('Failed to create organization A')
    orgA = a.id
    await owner.organizations.addMember({ organizationId: orgA, email: memberEmail, role: 'member' })

    const b = await member.organizations.create({ name: `billing-e2e-B-${Date.now()}` })
    if (!b) throw new Error('Failed to create organization B')
    orgB = b.id

    const goal = await owner.goals.createGoal({ name: 'billing-e2e-goal', organizationId: orgA })
    if (!goal) throw new Error('Failed to create goal')
    goalId = goal.id!
  })

  afterAll(async () => {
    await deleteAllGoals()
    if (orgA) await owner.organizations.delete(orgA).catch(() => null)
    if (orgB) await member.organizations.delete(orgB).catch(() => null)
  })

  describe('currencies', () => {
    it('lists the seeded currencies for any logged-in user', async () => {
      const currencies = await member.billing.fetchCurrencies()
      expect(currencies.length).toBeGreaterThanOrEqual(20)
      const jpy = currencies.find((c) => c.code.trim() === 'JPY')
      expect(jpy?.decimalDigits).toBe(0)
      expect(currencies.find((c) => c.code.trim() === 'USD')?.symbol).toBe('$')
    })

    it('refuses anonymous access', async () => {
      const response = await axios.get(`${API_URL}/module/billing/currencies`, { validateStatus: () => true })
      expect(response.status).toBe(401)
    })
  })

  describe('sellers', () => {
    it('owner creates a seller with bank details and requisites', async () => {
      const seller = await owner.billing.createSeller(sellerPayload(orgA))
      expect(seller.id).toBeGreaterThan(0)
      expect(seller.archived).toBe(false)
      expect(seller.requisites[0].label).toBe('VAT ID')
      sellerId = seller.id
    })

    it('rejects an empty name and an invalid currency', async () => {
      const noName = await ownerRaw.post('/module/billing/sellers', { ...sellerPayload(orgA), name: '' })
      expect(noName.status).toBe(400)
      const badCurrency = await ownerRaw.post('/module/billing/sellers', { ...sellerPayload(orgA), currencyCode: 'euro' })
      expect(badCurrency.status).toBe(400)
    })

    it('ignores foreign keys in the payload instead of failing', async () => {
      const response = await ownerRaw.patch(`/module/billing/sellers/${sellerId}`, {
        ...sellerPayload(orgA),
        organizationId: undefined,
        id: 999999,
        createdAt: '2000-01-01',
        archived: true,
        legalName: 'Renamed LLC',
      })
      expect(response.status).toBe(200)
      expect(response.data.response.id).toBe(sellerId)
      expect(response.data.response.archived).toBe(false)
      expect(response.data.response.legalName).toBe('Renamed LLC')
    })

    it('a member of the organization cannot see or manage sellers', async () => {
      const list = await memberRaw.get('/module/billing/sellers', { params: { organizationId: orgA } })
      expect(list.status).toBe(403)
      const create = await memberRaw.post('/module/billing/sellers', sellerPayload(orgA))
      expect(create.status).toBe(403)
      const update = await memberRaw.patch(`/module/billing/sellers/${sellerId}`, { ...sellerPayload(orgA), organizationId: undefined })
      expect(update.status).toBe(403)
      const remove = await memberRaw.delete(`/module/billing/sellers/${sellerId}`)
      expect(remove.status).toBe(403)
    })

    it('an owner of another organization cannot reach a seller by id', async () => {
      const foreign = await member.billing.createSeller(sellerPayload(orgB))
      foreignSellerId = foreign.id
      const read = await ownerRaw.patch(`/module/billing/sellers/${foreignSellerId}`, { ...sellerPayload(orgB), organizationId: undefined })
      expect(read.status).toBe(403)
      const archive = await ownerRaw.patch(`/module/billing/sellers/${foreignSellerId}/archive`, { archived: true })
      expect(archive.status).toBe(403)
      const missing = await ownerRaw.patch('/module/billing/sellers/999999/archive', { archived: true })
      expect(missing.status).toBe(404)
    })

    it('archived sellers are hidden from the list unless asked for', async () => {
      const archived = await owner.billing.archiveSeller({ id: sellerId, archived: true })
      expect(archived.archived).toBe(true)
      const hidden = await owner.billing.fetchSellers({ organizationId: orgA })
      expect(hidden.map((s) => s.id)).not.toContain(sellerId)
      const shown = await owner.billing.fetchSellers({ organizationId: orgA, includeArchived: true })
      expect(shown.map((s) => s.id)).toContain(sellerId)
      const restored = await owner.billing.archiveSeller({ id: sellerId, archived: false })
      expect(restored.archived).toBe(false)
    })
  })

  describe('clients', () => {
    it('owner creates a client and a person-type client', async () => {
      const client = await owner.billing.createCounterparty(counterpartyPayload(orgA))
      expect(client.kind).toBe('organization')
      counterpartyId = client.id
      const person = await owner.billing.createCounterparty({ ...counterpartyPayload(orgA), kind: 'person', name: 'John', legalName: '' })
      expect(person.kind).toBe('person')
      const removed = await owner.billing.deleteCounterparty(person.id)
      expect(removed).toBe(true)
    })

    it('rejects an unknown kind', async () => {
      const response = await ownerRaw.post('/module/billing/counterparties', { ...counterpartyPayload(orgA), kind: 'alien' })
      expect(response.status).toBe(400)
    })

    it('a member cannot list clients', async () => {
      const response = await memberRaw.get('/module/billing/counterparties', { params: { organizationId: orgA } })
      expect(response.status).toBe(403)
    })
  })

  describe('invoice drafts', () => {
    it('creates a draft with snapshots, project name and computed totals', async () => {
      const invoice = await owner.invoices.create(invoicePayload('E2E-0001'))
      invoiceId = invoice.id
      expect(invoice.status).toBe('draft')
      expect(invoice.goalName).toBe('billing-e2e-goal')
      expect(invoice.seller.legalName).toBe('Renamed LLC')
      expect(invoice.counterparty.contactPerson).toBe('Anna')
      expect(invoice.lines).toHaveLength(2)
      expect(invoice.lines[1].quantity).toBe(10.5)
      expect(invoice.totalsFrozen).toBe(false)
      expect(invoice.totals).toEqual({ subtotal: 1840, discount: 184, taxable: 1656, tax: 314.64, total: 1970.64 })
      expect(invoice.issuedAt).toBeNull()
      expect(invoice.replacesInvoiceId).toBeNull()
    })

    it('refuses a duplicate number inside the organization and allows it in another', async () => {
      const duplicate = await ownerRaw.post('/module/invoices', invoicePayload('E2E-0001'))
      expect(duplicate.status).toBe(409)

      const foreignClient = await member.billing.createCounterparty(counterpartyPayload(orgB))
      const sameNumberElsewhere = await member.invoices.create({
        ...invoicePayload('E2E-0001'),
        organizationId: orgB,
        goalId: null,
        sellerId: foreignSellerId,
        counterpartyId: foreignClient.id,
      })
      expect(sameNumberElsewhere.number).toBe('E2E-0001')
      expect(sameNumberElsewhere.goalId).toBeNull()
      expect(sameNumberElsewhere.goalName).toBe('')
    })

    it('refuses a seller, a client or a project from another organization', async () => {
      const seller = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), sellerId: foreignSellerId })
      expect(seller.status).toBe(422)
      expect(seller.data).toBe('seller_not_found')
      const client = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), counterpartyId: 999999 })
      expect(client.status).toBe(422)
      const goal = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), goalId: 999999 })
      expect(goal.status).toBe(422)
    })

    it('validates dates, enums and lines', async () => {
      const badDate = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), issueDate: '06.09.2026' })
      expect(badDate.status).toBe(400)
      const badUnit = await ownerRaw.post('/module/invoices', {
        ...invoicePayload('E2E-0002'),
        lines: [{ taskId: null, description: 'x', unit: 'kg', quantity: 1, unitPrice: 1 }],
      })
      expect(badUnit.status).toBe(400)
      const noLines = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), lines: [] })
      expect(noLines.status).toBe(400)
      const negative = await ownerRaw.post('/module/invoices', { ...invoicePayload('E2E-0002'), discountValue: -5 })
      expect(negative.status).toBe(400)
    })

    it('replaces lines and recomputes totals on update', async () => {
      const { organizationId: _org, ...data } = invoicePayload('E2E-0001')
      const updated = await owner.invoices.update({
        id: invoiceId,
        data: { ...data, discountValue: 0, taxExempt: true, lines: [{ taskId: null, description: 'Only', unit: 'pcs', quantity: 2, unitPrice: 5 }] },
      })
      expect(updated.lines).toHaveLength(1)
      expect(updated.totals.total).toBe(10)
      await owner.invoices.update({ id: invoiceId, data })
    })

    it('lists invoices of the organization and hides those of archived clients', async () => {
      const visible = await owner.invoices.fetch({ organizationId: orgA })
      expect(visible.map((i) => i.id)).toContain(invoiceId)

      await owner.billing.archiveCounterparty({ id: counterpartyId, archived: true })
      const hidden = await owner.invoices.fetch({ organizationId: orgA })
      expect(hidden.map((i) => i.id)).not.toContain(invoiceId)
      const shown = await owner.invoices.fetch({ organizationId: orgA, includeArchived: true })
      expect(shown.map((i) => i.id)).toContain(invoiceId)
      await owner.billing.archiveCounterparty({ id: counterpartyId, archived: false })
    })

    it('a member and a foreign owner cannot read the invoice', async () => {
      const asMember = await memberRaw.get(`/module/invoices/${invoiceId}`)
      expect(asMember.status).toBe(403)
      const list = await memberRaw.get('/module/invoices', { params: { organizationId: orgA } })
      expect(list.status).toBe(403)
      const pdf = await memberRaw.get(`/module/invoices/${invoiceId}/pdf`)
      expect(pdf.status).toBe(403)
    })

    it('a seller or a client with invoices cannot be deleted', async () => {
      const seller = await ownerRaw.delete(`/module/billing/sellers/${sellerId}`)
      expect(seller.status).toBe(409)
      const client = await ownerRaw.delete(`/module/billing/counterparties/${counterpartyId}`)
      expect(client.status).toBe(409)
    })
  })

  describe('invoice lifecycle', () => {
    it('cannot be paid or voided while it is a draft', async () => {
      const paid = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'paid' })
      expect(paid.status).toBe(409)
      expect(paid.data.error).toBe('invalid_transition')
      const voided = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'void' })
      expect(voided.status).toBe(409)
    })

    it('cannot be corrected while it is a draft', async () => {
      const response = await ownerRaw.post(`/module/invoices/${invoiceId}/reissue`, {})
      expect(response.status).toBe(409)
    })

    it('reports every missing requisite before issuing', async () => {
      const response = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' })
      expect(response.status).toBe(422)
      expect(response.data.error).toBe('missing_requisites')
      expect(response.data.missing).toEqual(expect.arrayContaining(['seller.address', 'seller.bank', 'counterparty.address']))
    })

    it('issues once the requisites are complete and freezes the totals', async () => {
      const { organizationId: _s, ...seller } = sellerPayload(orgA)
      await owner.billing.updateSeller({ id: sellerId, data: { ...seller, address: 'Seller street 1', bank: { ...seller.bank, iban: 'DE00' } } })
      const { organizationId: _c, ...client } = counterpartyPayload(orgA)
      await owner.billing.updateCounterparty({ id: counterpartyId, data: { ...client, address: 'Client street 2' } })
      const { organizationId: _i, ...data } = invoicePayload('E2E-0001')
      await owner.invoices.update({ id: invoiceId, data })

      const issued = await owner.invoices.setStatus({ id: invoiceId, status: 'issued' })
      expect(issued.status).toBe('issued')
      expect(issued.issuedAt).toBeTruthy()
      expect(issued.totalsFrozen).toBe(true)
      expect(issued.totals.total).toBe(1970.64)
      expect(issued.seller.address).toBe('Seller street 1')
      expect(issued.templateVersion).toBe(1)
    })

    it('an issued invoice keeps its snapshot when the seller changes again', async () => {
      const { organizationId: _s, ...seller } = sellerPayload(orgA)
      await owner.billing.updateSeller({ id: sellerId, data: { ...seller, address: 'Moved elsewhere', bank: { ...seller.bank, iban: 'DE99' } } })
      const invoice = await owner.invoices.fetchById(invoiceId)
      expect(invoice.seller.address).toBe('Seller street 1')
      expect(invoice.seller.bank.iban).toBe('DE00')
    })

    it('cannot be edited, deleted or moved back to draft after issue', async () => {
      const { organizationId: _i, ...data } = invoicePayload('E2E-0001')
      const edit = await ownerRaw.patch(`/module/invoices/${invoiceId}`, data)
      expect(edit.status).toBe(409)
      expect(edit.data).toBe('not_draft')
      const remove = await ownerRaw.delete(`/module/invoices/${invoiceId}`)
      expect(remove.status).toBe(409)
      const back = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'draft' })
      expect(back.status).toBe(409)
    })

    it('marks paid, refuses to void a paid invoice, and unmarks', async () => {
      const paid = await owner.invoices.setStatus({ id: invoiceId, status: 'paid' })
      expect(paid.paidAt).toBeTruthy()
      const voided = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'void' })
      expect(voided.status).toBe(409)
      const draft = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'draft' })
      expect(draft.status).toBe(409)
      const unpaid = await owner.invoices.setStatus({ id: invoiceId, status: 'issued' })
      expect(unpaid.paidAt).toBeNull()
      expect(unpaid.issuedAt).toBeTruthy()
    })

    it('renders the PDF in both languages', async () => {
      for (const lang of ['en', 'ru'] as const) {
        const blob = await owner.invoices.fetchPdf({ id: invoiceId, lang })
        const bytes = Buffer.from(await blob.arrayBuffer())
        expect(bytes.subarray(0, 4).toString()).toBe('%PDF')
        expect(bytes.length).toBeGreaterThan(1000)
      }
      const bad = await ownerRaw.get(`/module/invoices/${invoiceId}/pdf`, { params: { lang: 'fr' } })
      expect(bad.status).toBe(400)
    })

    it('corrects an issued invoice: voids it and opens a replacement draft with the next number', async () => {
      const copy = await owner.invoices.reissue(invoiceId)
      expect(copy.status).toBe('draft')
      expect(copy.number).toBe('E2E-0002')
      expect(copy.replacesInvoiceId).toBe(invoiceId)
      expect(copy.lines).toHaveLength(2)
      expect(copy.totalsFrozen).toBe(false)
      expect(copy.seller.address).toBe('Moved elsewhere')

      const original = await owner.invoices.fetchById(invoiceId)
      expect(original.status).toBe('void')
      expect(original.voidedAt).toBeTruthy()
      expect(original.totalsFrozen).toBe(true)

      const revive = await ownerRaw.patch(`/module/invoices/${invoiceId}/status`, { status: 'issued' })
      expect(revive.status).toBe(409)
      const removeVoid = await ownerRaw.delete(`/module/invoices/${invoiceId}`)
      expect(removeVoid.status).toBe(409)

      const again = await owner.invoices.reissue(invoiceId)
      expect(again.number).toBe('E2E-0003')
      expect(await owner.invoices.delete(again.id)).toBe(true)
      expect(await owner.invoices.delete(copy.id)).toBe(true)
    })

    it('the voided invoice renders with the void watermark and is still not deletable', async () => {
      const blob = await owner.invoices.fetchPdf({ id: invoiceId, lang: 'en' })
      expect(Buffer.from(await blob.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF')
      const remove = await ownerRaw.delete(`/module/invoices/${invoiceId}`)
      expect(remove.status).toBe(409)
    })
  })

  describe('API tokens', () => {
    it('a token without billing_can_manage is refused, a token with it is accepted', async () => {
      const narrow = await owner.apiTokens.create({ name: 'e2e-narrow', allowedPermissions: ['goal_can_watch_content'] })
      const wide = await owner.apiTokens.create({ name: 'e2e-billing', allowedPermissions: ['billing_can_manage'] })
      const withToken = (token: string) =>
        axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true })

      const refused = await withToken(narrow.token).get('/module/invoices', { params: { organizationId: orgA } })
      expect(refused.status).toBe(403)
      const accepted = await withToken(wide.token).get('/module/invoices', { params: { organizationId: orgA } })
      expect(accepted.status).toBe(200)
      const unrestricted = await owner.apiTokens.create({ name: 'e2e-unrestricted' })
      const passes = await withToken(unrestricted.token).get('/module/billing/sellers', { params: { organizationId: orgA } })
      expect(passes.status).toBe(200)

      for (const item of [narrow, wide, unrestricted]) await owner.apiTokens.delete(item.item.id)
    })
  })

  describe('organization deletion', () => {
    it('removes the organization together with its billing records', async () => {
      const deleted = await owner.organizations.delete(orgA)
      expect(deleted).toBeTruthy()
      const seller = await ownerRaw.patch(`/module/billing/sellers/${sellerId}/archive`, { archived: true })
      expect(seller.status).toBe(404)
      const invoice = await ownerRaw.get(`/module/invoices/${invoiceId}`)
      expect(invoice.status).toBe(404)
      orgA = 0
    })
  })
})
