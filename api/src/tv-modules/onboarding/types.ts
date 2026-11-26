import { type } from 'arktype'
import { ONBOARDING_FINISH_STATUSES, type OnboardingFinishStatus } from 'taskview-api'

export const FinishOnboardingArkType = type({
  status: type.enumerated(...ONBOARDING_FINISH_STATUSES),
})

export type FinishOnboardingArgs = {
  userId: number
  status: OnboardingFinishStatus
}
