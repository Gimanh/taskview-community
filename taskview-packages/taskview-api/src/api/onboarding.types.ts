export const ONBOARDING_FINISH_STATUSES = ['completed', 'dismissed'] as const

export type OnboardingFinishStatus = typeof ONBOARDING_FINISH_STATUSES[number]

/** pending: the user has neither finished nor declined the first-run tour. */
export type OnboardingStatus = 'pending' | OnboardingFinishStatus

export type OnboardingState = {
  status: OnboardingStatus
}

export type OnboardingArgFinish = {
  status: OnboardingFinishStatus
}
