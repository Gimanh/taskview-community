import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type { UiPreferences } from './ui-preferences.types'

export default class TvUiPreferencesApi extends TvApiBase {
  protected moduleUrl = '/module/ui-preferences'

  public async fetch() {
    return this.request(
      this.$axios.get<AppResponse<UiPreferences>>(this.moduleUrl),
    )
  }

  public async update(prefs: UiPreferences) {
    return this.request(
      this.$axios.put<AppResponse<UiPreferences>>(this.moduleUrl, prefs),
    )
  }
}
