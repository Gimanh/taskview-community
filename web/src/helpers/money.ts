import type { ComputeTotalsArgs, FormatMoneyArgs, InvoiceTotals } from '@/types/invoices.types'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatMoney({ amount, currencyCode, locale }: FormatMoneyArgs): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

export function lineAmount(quantity: number, unitPrice: number): number {
  return round2(quantity * unitPrice)
}

export function computeInvoiceTotals({ lines, discountType, discountValue, taxRate, taxExempt }: ComputeTotalsArgs): InvoiceTotals {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineAmount(line.quantity, line.unitPrice), 0))
  const rawDiscount = discountType === 'percent' ? subtotal * (discountValue / 100) : discountValue
  const discount = round2(Math.min(Math.max(rawDiscount, 0), subtotal))
  const taxable = round2(subtotal - discount)
  const tax = taxExempt ? 0 : round2(taxable * (taxRate / 100))
  return { subtotal, discount, taxable, tax, total: round2(taxable + tax) }
}
