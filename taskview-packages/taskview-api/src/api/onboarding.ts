import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type { OnboardingArgFinish, OnboardingState } from './onboarding.types'

export default class TvOnboardingApi extends TvApiBase {
  protected moduleUrl = '/module/onboarding'

  public async fetch() {
    return this.request(
      this.$axios.get<AppResponse<OnboardingState>>(this.moduleUrl),
    )
  }

  public async finish(args: OnboardingArgFinish) {
    return this.request(
      this.$axios.post<AppResponse<OnboardingState>>(`${this.moduleUrl}/finish`, args),
    )
  }
}
