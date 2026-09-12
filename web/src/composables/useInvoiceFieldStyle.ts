// Field look shared by every invoices form: xl controls, soft variant (filled
// background, no ring) in both themes, 14px radius.
export function useInvoiceFieldStyle() {
  const inputVariant = 'soft' as const
  const inputUi = { base: 'rounded-xl dark:bg-accented/40 dark:hover:bg-accented/60 dark:focus:bg-accented/60' }

  const dateButtonVariant = 'soft' as const
  const dateButtonUi = { base: 'rounded-xl justify-start dark:bg-accented/40 dark:hover:bg-accented/60', leadingIcon: 'size-4.5' }

  const sectionClass = 'flex flex-col gap-3 rounded-2xl p-3 shadow-sm dark:bg-tv-ui-bg-elevated'

  return { inputVariant, inputUi, dateButtonVariant, dateButtonUi, sectionClass }
}
