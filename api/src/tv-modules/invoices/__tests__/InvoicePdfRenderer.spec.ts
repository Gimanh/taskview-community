import { describe, expect, it } from 'vitest'
import { InvoicePdfRenderer } from '../InvoicePdfRenderer'
import type { InvoiceForClient } from '../types'

function collectTexts(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node)
  else if (Array.isArray(node)) node.forEach(child => collectTexts(child, out))
  else if (node && typeof node === 'object') Object.values(node).forEach(value => collectTexts(value, out))
  return out
}

function expectText(texts: string[], value: string) {
  expect(texts.some(text => text.includes(value)), `expected "${value}" in the document`).toBe(true)
}

function expectNoText(texts: string[], value: string) {
  expect(texts.some(text => text.includes(value)), `did not expect "${value}" in the document`).toBe(false)
}

function fullInvoice(): InvoiceForClient {
  return {
    id: 7,
    organizationId: 1,
    goalId: 2,
    goalName: 'Website',
    sellerId: 3,
    counterpartyId: 4,
    number: 'INV-2026-007',
    status: 'issued',
    reference: 'PO-42',
    currencyCode: 'EUR',
    issueDate: '2026-09-01',
    paymentTerms: 'net14',
    dueDate: '2026-09-15',
    periodFrom: '2026-08-01',
    periodTo: '2026-08-31',
    discountType: 'percent',
    discountValue: 10,
    taxRate: 19,
    taxExempt: false,
    taxNote: '',
    notes: 'Thank you for your business',
    terms: 'Payment within 14 days',
    createdBy: 1,
    issuedAt: new Date('2026-09-01T10:00:00Z'),
    paidAt: null,
    voidedAt: null,
    replacesInvoiceId: null,
    templateVersion: 1,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
    seller: {
      name: 'Acme Studio',
      legalName: 'Acme Studio LLC',
      address: 'Baker st 221b, London',
      email: 'billing@acme.test',
      phone: '+44 20 1234',
      logoUrl: 'https://acme.test/logo.png',
      bank: {
        bankName: 'Barclays',
        accountNumber: '40817810',
        iban: 'GB29NWBK',
        swift: 'BARCGB22',
        correspondentAccount: '30101810',
      },
      requisites: [
        { key: 'vat', label: 'VAT ID', value: 'GB123456' },
        { key: 'reg', label: 'Reg. No', value: '0987' },
      ],
    },
    counterparty: {
      kind: 'organization',
      name: 'Globex',
      legalName: 'Globex GmbH',
      address: 'Hauptstr. 5, Berlin',
      email: 'ap@globex.test',
      phone: '+49 30 555',
      contactPerson: 'Anna Schmidt',
      requisites: [{ key: 'vat', label: 'USt-IdNr.', value: 'DE999' }],
    },
    lines: [
      { id: 1, taskId: null, description: 'Design work', unit: 'hours', quantity: 10.5, unitPrice: 80 },
      { id: 2, taskId: 5, description: 'Hosting', unit: 'pcs', quantity: 2, unitPrice: 15 },
    ],
    totals: { subtotal: 870, discount: 87, taxable: 783, tax: 148.77, total: 931.77 },
    totalsFrozen: true,
  }
}

describe('InvoicePdfRenderer', () => {
  const renderer = new InvoicePdfRenderer()

  it('prints every seller field', () => {
    const texts = collectTexts(renderer.buildDocument(fullInvoice(), 'en'))
    expectText(texts, 'Acme Studio LLC')
    expectText(texts, 'Baker st 221b, London')
    expectText(texts, 'VAT ID: GB123456')
    expectText(texts, 'Reg. No: 0987')
    expectText(texts, 'billing@acme.test')
    expectText(texts, '+44 20 1234')
    expectText(texts, 'PAYMENT DETAILS')
    expectText(texts, 'Barclays')
    expectText(texts, '40817810')
    expectText(texts, 'GB29NWBK')
    expectText(texts, 'BARCGB22')
    expectText(texts, '30101810')
  })

  it('prints every counterparty field', () => {
    const texts = collectTexts(renderer.buildDocument(fullInvoice(), 'en'))
    expectText(texts, 'BILL TO')
    expectText(texts, 'Globex GmbH')
    expectText(texts, 'Anna Schmidt')
    expectText(texts, 'Hauptstr. 5, Berlin')
    expectText(texts, 'USt-IdNr.: DE999')
    expectText(texts, 'ap@globex.test')
    expectText(texts, '+49 30 555')
  })

  it('prints the invoice meta, lines, totals, terms and notes', () => {
    const texts = collectTexts(renderer.buildDocument(fullInvoice(), 'en'))
    expectText(texts, 'INV-2026-007')
    expectText(texts, 'PO-42')
    expectText(texts, '01.09.2026')
    expectText(texts, '15.09.2026')
    expectText(texts, '01.08.2026 – 31.08.2026')
    expectText(texts, 'Design work')
    expectText(texts, '10.5')
    expectText(texts, 'Hosting')
    expectText(texts, '870.00')
    expectText(texts, '87.00')
    expectText(texts, 'Tax 19%')
    expectText(texts, '148.77')
    expectText(texts, '931.77')
    expectText(texts, 'Payment within 14 days')
    expectText(texts, 'Thank you for your business')
  })

  it('falls back to the display name when the legal name is empty', () => {
    const invoice = fullInvoice()
    invoice.seller.legalName = ''
    invoice.counterparty.legalName = ''
    const texts = collectTexts(renderer.buildDocument(invoice, 'en'))
    expectText(texts, 'Acme Studio')
    expectText(texts, 'Globex')
    expectNoText(texts, 'Acme Studio LLC')
    expectNoText(texts, 'Globex GmbH')
  })

  it('skips empty optional fields instead of printing blanks', () => {
    const invoice = fullInvoice()
    invoice.counterparty = { ...invoice.counterparty, address: '', email: '', phone: '', contactPerson: '', requisites: [] }
    invoice.seller.bank = { bankName: '', accountNumber: '', iban: '', swift: '', correspondentAccount: '' }
    invoice.seller.requisites = [{ key: 'empty', label: 'Empty', value: '   ' }]
    invoice.reference = ''
    invoice.dueDate = null
    invoice.periodFrom = null
    invoice.periodTo = null
    invoice.terms = ''
    invoice.notes = ''
    const texts = collectTexts(renderer.buildDocument(invoice, 'en'))
    expectNoText(texts, 'PAYMENT DETAILS')
    expectNoText(texts, 'Empty:')
    expectNoText(texts, 'Anna Schmidt')
    expectNoText(texts, 'Hauptstr. 5, Berlin')
    expectNoText(texts, 'Due date')
    expectNoText(texts, 'Reference')
    expectNoText(texts, 'Period')
    expect(texts.filter(text => text === ' · ')).toHaveLength(0)
  })

  it('prints the tax note instead of the tax row for a tax-exempt invoice', () => {
    const invoice = fullInvoice()
    invoice.taxExempt = true
    invoice.taxNote = 'VAT not applicable'
    const texts = collectTexts(renderer.buildDocument(invoice, 'en'))
    expectText(texts, 'VAT not applicable')
    expectNoText(texts, 'Tax 19%')
  })

  it('uses russian labels and a void watermark', () => {
    const invoice = fullInvoice()
    invoice.status = 'void'
    const document = renderer.buildDocument(invoice, 'ru') as { watermark?: { text: string } }
    const texts = collectTexts(document)
    expectText(texts, 'СЧЁТ')
    expectText(texts, 'ПЛАТЕЛЬЩИК')
    expectText(texts, 'РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ')
    expectText(texts, 'Налог 19%')
    expect(document.watermark?.text).toBe('АННУЛИРОВАН')
  })
})
