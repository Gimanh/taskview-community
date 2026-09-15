import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InvoiceFormValue } from '@/types/invoices.types'

export function useInvoiceValidation(value: Ref<InvoiceFormValue>) {
  const { t } = useI18n()

  const missing = computed(() => {
    const form = value.value
    const items: string[] = []
    if (!form.number.trim()) items.push(t('invoices.fields.number'))
    if (form.sellerId === null) items.push(t('invoices.seller.title'))
    if (form.counterpartyId === null) items.push(t('invoices.counterparty.title'))
    if (form.goalId === null) items.push(t('invoices.fields.project'))
    if (form.issueDate === null) items.push(t('invoices.fields.issueDate'))
    if (form.lines.length === 0) items.push(t('invoices.validation.lines'))
    else if (form.lines.some((line) => !line.description.trim())) items.push(t('invoices.validation.lineDescriptions'))
    return items
  })

  const canSubmit = computed(() => missing.value.length === 0)

  return { missing, canSubmit }
}
