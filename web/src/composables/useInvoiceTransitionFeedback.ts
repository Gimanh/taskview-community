import { useI18n } from 'vue-i18n'
import type { InvoiceMissingRequisite, InvoiceStatus } from 'taskview-api'
import type { InvoiceTransitionResult } from '@/types/invoices.types'

const REQUISITE_KEYS: Record<InvoiceMissingRequisite, string> = {
  'seller.name': 'sellerName',
  'seller.address': 'sellerAddress',
  'seller.bank': 'sellerBank',
  'counterparty.name': 'counterpartyName',
  'counterparty.address': 'counterpartyAddress',
  lines: 'lines',
}

export function useInvoiceTransitionFeedback() {
  const { t } = useI18n()
  const toast = useToast()

  function report(result: InvoiceTransitionResult, status: InvoiceStatus) {
    if ('invoice' in result) {
      toast.add({ title: t(`invoices.toasts.transition.${status}`), color: 'success' })
      return
    }
    if (result.error === 'missing_requisites') {
      const items = result.missing.map((key) => t(`invoices.requisiteNames.${REQUISITE_KEYS[key]}`)).join(', ')
      toast.add({ title: t('invoices.toasts.missingRequisites'), description: items, color: 'warning' })
      return
    }
    toast.add({
      title: t(result.error === 'invalid_transition' ? 'invoices.toasts.invalidTransition' : 'invoices.toasts.saveFailed'),
      color: 'error',
    })
  }

  return { report }
}
