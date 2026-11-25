import type { SessionUser } from './auth-test-helpers.types'

export type OnboardingRawResult = {
  status: number
  data: unknown
}

export type OnboardingFinishRawArgs = {
  token?: string
  body: unknown
  /** Sends the body as is, without JSON encoding (to post malformed JSON) */
  raw?: boolean
}

export type OnboardingRow = {
  status: string
}

export type OnboardingBackfillAccounts = {
  projectOwner: SessionUser
  archivedProjectOwner: SessionUser
  projectMember: SessionUser
  inboxOnly: SessionUser
  alreadyCompleted: SessionUser
}

export type OnboardingBackfillResult = Record<keyof OnboardingBackfillAccounts, string | null>
