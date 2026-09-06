import { isAxiosError } from 'axios'

export function httpStatusOf(error: unknown): number | null {
  return isAxiosError(error) ? (error.response?.status ?? null) : null
}
