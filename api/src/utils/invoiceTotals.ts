export type InvoiceTotalsInput = {
  lines: { quantity: number | string; unitPrice: number | string }[]
  discountType: 'percent' | 'amount'
  discountValue: number | string
  taxRate: number | string
  taxExempt: boolean
}

export type InvoiceTotalsResult = {
  subtotal: number
  discount: number
  taxable: number
  tax: number
  total: number
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function invoiceLineAmount(quantity: number | string, unitPrice: number | string): number {
  return round2(Number(quantity) * Number(unitPrice))
}

export function computeInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotalsResult {
  const subtotal = round2(input.lines.reduce((sum, line) => sum + invoiceLineAmount(line.quantity, line.unitPrice), 0))
  const discountValue = Number(input.discountValue)
  const rawDiscount = input.discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue
  const discount = round2(Math.min(Math.max(rawDiscount, 0), subtotal))
  const taxable = round2(subtotal - discount)
  const tax = input.taxExempt ? 0 : round2(taxable * (Number(input.taxRate) / 100))
  return { subtotal, discount, taxable, tax, total: round2(taxable + tax) }
}
