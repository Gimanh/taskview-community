import { ref } from 'vue'
import type { ButtonProps } from '@nuxt/ui'

const ACTIVATOR_BASE = 'rounded-14! px-3.5! text-base h-13! font-normal!'
const DROPDOWN_ITEM_BASE = 'h-11 rounded-10!'

export function useNuxtUiTaskItemStyles() {
  const buttonStyles = ref<ButtonProps['ui']>({
    base: ACTIVATOR_BASE,
  })
  const dropdownItemStyles = ref<ButtonProps['ui']>({
    base: DROPDOWN_ITEM_BASE,
  })
  const dropdownItemUi = (leadingIcon: string): ButtonProps['ui'] => ({
    base: DROPDOWN_ITEM_BASE,
    leadingIcon,
  })
  const activatorUi = (leadingIcon?: string): ButtonProps['ui'] => ({
    base: ACTIVATOR_BASE,
    leadingIcon: `${leadingIcon ?? ''} size-5`,
  })
  return {
    buttonStyles,
    dropdownItemStyles,
    dropdownItemUi,
    activatorUi,
  }
}
