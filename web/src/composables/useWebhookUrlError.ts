import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { isAxiosError } from 'axios'
import { WEBHOOK_URL_ERROR_CODES, type WebhookUrlErrorCode, type WebhookUrlErrorResponse } from 'taskview-api'

const isUrlErrorCode = (value: unknown): value is WebhookUrlErrorCode =>
  typeof value === 'string' && (WEBHOOK_URL_ERROR_CODES as readonly string[]).includes(value)

export function useWebhookUrlError() {
  const { t } = useI18n()
  const message = ref<string | null>(null)

  function capture(err: unknown): boolean {
    if (!isAxiosError(err) || err.response?.status !== 400) return false
    const body = err.response.data?.response as Partial<WebhookUrlErrorResponse> | undefined
    if (!isUrlErrorCode(body?.code)) return false
    message.value = t(`webhooks.urlErrors.${body.code}`)
    return true
  }

  function reset() {
    message.value = null
  }

  return { message, capture, reset }
}
