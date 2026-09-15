import type { InvoiceItem } from 'taskview-api'
import type { AddDaysArgs } from '@/types/invoices.types'

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isInvoiceOverdue(invoice: Pick<InvoiceItem, 'status' | 'dueDate'>): boolean {
  return invoice.status === 'issued' && invoice.dueDate !== null && invoice.dueDate < todayIso()
}

export function addDays({ date, days }: AddDaysArgs): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return next.toISOString().slice(0, 10)
}
