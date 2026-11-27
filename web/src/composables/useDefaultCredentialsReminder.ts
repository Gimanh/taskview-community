import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user.store'

export const DEFAULT_USER_EMAIL = 'test@mail.dest'
const REMINDER_TOAST_ID = 'default-credentials-reminder'

export function useDefaultCredentialsReminder() {
  const { t } = useI18n()
  const toast = useToast()
  const router = useRouter()
  const userStore = useUserStore()

  watch(
    () => userStore.email.toLowerCase() === DEFAULT_USER_EMAIL,
    (isDefaultUser) => {
      if (!isDefaultUser) {
        toast.remove(REMINDER_TOAST_ID)
        return
      }
      toast.add({
        id: REMINDER_TOAST_ID,
        title: t('account.defaultCredsWarning'),
        description: t('account.defaultCredsDescription'),
        color: 'warning',
        icon: 'i-lucide-shield-alert',
        duration: 0,
        actions: [
          {
            label: t('account.defaultCredsChange'),
            color: 'warning',
            onClick: () => {
              router.push({ name: 'account' })
            },
          },
        ],
      })
    },
    { immediate: true },
  )
}
