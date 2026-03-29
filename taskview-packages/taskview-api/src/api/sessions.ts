import TvApiBase from './base'
import type { AppResponse } from '@/api/base.types'
import type { SessionItem } from './sessions.types'

export default class TvSessions extends TvApiBase {
  protected moduleUrl = '/module/sessions'

  public async fetch() {
    return this.request(
      this.$axios.get<AppResponse<SessionItem[]>>(`${this.moduleUrl}`)
    )
  }

  public async delete(id: number) {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}`, { data: { id } })
    )
  }

  public async deleteAll() {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/all`)
    )
  }
}
