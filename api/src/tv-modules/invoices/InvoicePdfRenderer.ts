import pdfmakeModule from 'pdfmake'
import vfs from 'pdfmake/build/vfs_fonts.js'
import { invoiceLineAmount } from '../../utils/invoiceTotals'
import type { InvoiceForClient, InvoicePdfLang, PdfmakeServer } from './types'

const LABELS: Record<InvoicePdfLang, Record<string, string>> = {
  en: {
    title: 'INVOICE',
    void: 'VOID',
    issueDate: 'Issue date',
    dueDate: 'Due date',
    reference: 'Reference',
    period: 'Period',
    replaces: 'Replaces',
    billTo: 'Bill to',
    description: 'Description',
    qty: 'Qty',
    unit: 'Unit',
    price: 'Price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    total: 'Total',
    paymentDetails: 'Payment details',
    bankName: 'Bank',
    accountNumber: 'Account',
    iban: 'IBAN',
    swift: 'SWIFT / BIC',
    correspondentAccount: 'Correspondent account',
    service: 'service',
    hours: 'h',
    pcs: 'pcs',
  },
  ru: {
    title: 'СЧЁТ',
    void: 'АННУЛИРОВАН',
    issueDate: 'Дата выставления',
    dueDate: 'Срок оплаты',
    reference: 'Основание',
    period: 'Период',
    replaces: 'Взамен',
    billTo: 'Плательщик',
    description: 'Описание',
    qty: 'Кол-во',
    unit: 'Ед.',
    price: 'Цена',
    amount: 'Сумма',
    subtotal: 'Промежуточная сумма',
    discount: 'Скидка',
    tax: 'Налог',
    total: 'Итого',
    paymentDetails: 'Реквизиты для оплаты',
    bankName: 'Банк',
    accountNumber: 'Расчётный счёт',
    iban: 'IBAN',
    swift: 'SWIFT / БИК',
    correspondentAccount: 'Корр. счёт',
    service: 'усл.',
    hours: 'ч',
    pcs: 'шт.',
  },
}

const FONT_FILES = ['Roboto-Regular.ttf', 'Roboto-Medium.ttf', 'Roboto-Italic.ttf', 'Roboto-MediumItalic.ttf']
const MUTED = '#6b7280'
const RULE = '#d4d4d8'

export class InvoicePdfRenderer {
  private static fontsReady = false
  private readonly pdfmake = pdfmakeModule as unknown as PdfmakeServer

  constructor() {
    if (!InvoicePdfRenderer.fontsReady) {
      for (const name of FONT_FILES) this.pdfmake.virtualfs.writeFileSync(name, Buffer.from(vfs[name], 'base64'))
      this.pdfmake.setFonts({
        Roboto: {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-MediumItalic.ttf',
        },
      })
      InvoicePdfRenderer.fontsReady = true
    }
  }

  render(invoice: InvoiceForClient, lang: InvoicePdfLang): Promise<Buffer> {
    return this.pdfmake.createPdf(this.buildDocument(invoice, lang)).getBuffer()
  }

  private buildDocument(invoice: InvoiceForClient, lang: InvoicePdfLang) {
    const t = LABELS[lang]
    const money = (amount: number) => this.formatMoney(amount, invoice.currencyCode, lang)
    const date = (value: string | null) => this.formatDate(value, lang)

    const metaRows: [string, string][] = [[t.issueDate, date(invoice.issueDate)]]
    if (invoice.dueDate) metaRows.push([t.dueDate, date(invoice.dueDate)])
    if (invoice.reference) metaRows.push([t.reference, invoice.reference])
    if (invoice.periodFrom || invoice.periodTo) metaRows.push([t.period, `${date(invoice.periodFrom)} – ${date(invoice.periodTo)}`])

    const lineRows = invoice.lines.map((line) => [
      { text: line.description },
      { text: String(line.quantity), alignment: 'right' },
      { text: t[line.unit] ?? line.unit, color: MUTED },
      { text: money(line.unitPrice), alignment: 'right' },
      { text: money(invoiceLineAmount(line.quantity, line.unitPrice)), alignment: 'right' },
    ])

    const totalsRows: unknown[] = [[{ text: t.subtotal, color: MUTED }, { text: money(invoice.totals.subtotal), alignment: 'right' }]]
    if (invoice.totals.discount > 0) totalsRows.push([{ text: t.discount, color: MUTED }, { text: `−${money(invoice.totals.discount)}`, alignment: 'right' }])
    if (!invoice.taxExempt) totalsRows.push([{ text: `${t.tax} ${invoice.taxRate}%`, color: MUTED }, { text: money(invoice.totals.tax), alignment: 'right' }])
    totalsRows.push([{ text: t.total, bold: true, fontSize: 12 }, { text: money(invoice.totals.total), bold: true, fontSize: 12, alignment: 'right' }])

    const bank = invoice.seller.bank
    const bankRows = (
      [
        [t.bankName, bank.bankName],
        [t.accountNumber, bank.accountNumber],
        [t.iban, bank.iban],
        [t.swift, bank.swift],
        [t.correspondentAccount, bank.correspondentAccount],
      ] as [string, string][]
    ).filter(([, value]) => value.trim().length > 0)

    const content: unknown[] = [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: invoice.seller.legalName || invoice.seller.name, fontSize: 14, bold: true },
              ...this.partyLines(invoice.seller),
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: t.title, fontSize: 20, bold: true, alignment: 'right' },
              { text: invoice.number, alignment: 'right', margin: [0, 2, 0, 8] },
              {
                table: { body: metaRows.map(([label, value]) => [{ text: label, color: MUTED }, { text: value, alignment: 'right' }]) },
                layout: 'noBorders',
                fontSize: 9,
              },
            ],
          },
        ],
        columnGap: 24,
      },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: RULE }], margin: [0, 12, 0, 12] },
      { text: t.billTo.toUpperCase(), fontSize: 8, bold: true, color: MUTED },
      { text: invoice.counterparty.legalName || invoice.counterparty.name, bold: true, margin: [0, 2, 0, 0] },
      ...(invoice.counterparty.contactPerson ? [{ text: invoice.counterparty.contactPerson }] : []),
      ...this.partyLines(invoice.counterparty),
      {
        table: {
          headerRows: 1,
          widths: ['*', 40, 44, 80, 90],
          body: [
            [
              { text: t.description.toUpperCase(), style: 'th' },
              { text: t.qty.toUpperCase(), style: 'th', alignment: 'right' },
              { text: t.unit.toUpperCase(), style: 'th' },
              { text: t.price.toUpperCase(), style: 'th', alignment: 'right' },
              { text: t.amount.toUpperCase(), style: 'th', alignment: 'right' },
            ],
            ...lineRows,
          ],
        },
        layout: {
          hLineWidth: (index: number, node: { table: { body: unknown[] } }) => (index === 0 || index === node.table.body.length ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => RULE,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 18, 0, 8],
      },
      {
        columns: [
          { width: '*', text: '' },
          { width: 220, table: { widths: ['*', 'auto'], body: totalsRows }, layout: 'noBorders' },
        ],
      },
    ]

    if (bankRows.length > 0) {
      content.push(
        { text: t.paymentDetails.toUpperCase(), fontSize: 8, bold: true, color: MUTED, margin: [0, 20, 0, 4] },
        { table: { body: bankRows.map(([label, value]) => [{ text: label, color: MUTED }, { text: value }]) }, layout: 'noBorders' },
      )
    }
    if (invoice.taxExempt && invoice.taxNote) content.push({ text: invoice.taxNote, margin: [0, 16, 0, 0], color: '#374151' })
    if (invoice.terms) content.push({ text: invoice.terms, margin: [0, 8, 0, 0], color: '#374151' })
    if (invoice.notes) content.push({ text: invoice.notes, margin: [0, 8, 0, 0], color: '#374151' })

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      info: { title: invoice.number },
      ...(invoice.status === 'void' ? { watermark: { text: t.void, color: '#ef4444', opacity: 0.12, bold: true } } : {}),
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#18181b' },
      styles: { th: { fontSize: 8, bold: true, color: MUTED } },
      content,
    }
  }

  private partyLines(party: InvoiceForClient['seller'] | InvoiceForClient['counterparty']) {
    const lines: unknown[] = []
    if (party.address) lines.push({ text: party.address, color: MUTED, fontSize: 9 })
    for (const item of party.requisites) {
      if (item.label.trim() && item.value.trim()) lines.push({ text: `${item.label}: ${item.value}`, color: MUTED, fontSize: 9 })
    }
    const contacts = [party.email, party.phone].filter(Boolean).join(' · ')
    if (contacts) lines.push({ text: contacts, color: MUTED, fontSize: 9 })
    return lines
  }

  private formatMoney(amount: number, currencyCode: string, lang: InvoicePdfLang): string {
    try {
      return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: currencyCode }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currencyCode}`
    }
  }

  private formatDate(value: string | null, lang: InvoicePdfLang): string {
    if (!value) return ''
    const [year, month, day] = value.split('-')
    return lang === 'ru' ? `${day}.${month}.${year}` : `${day}.${month}.${year}`
  }
}
