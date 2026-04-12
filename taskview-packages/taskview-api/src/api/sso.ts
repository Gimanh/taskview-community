import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type {
  SsoConfig,
  SsoConfigArgCreate,
  SsoConfigArgUpdate,
  SsoProviderPublic,
} from './sso.types'

export default class TvSsoApi extends TvApiBase {
  protected moduleUrl = '/module/sso'

  public async listConfigs(organizationId: number) {
    return this.request(
      this.$axios.get<AppResponse<SsoConfig[]>>(`${this.moduleUrl}/admin/configs`, {
        params: { organizationId },
      })
    )
  }

  public async createConfig(data: SsoConfigArgCreate) {
    return this.request(
      this.$axios.post<AppResponse<SsoConfig>>(`${this.moduleUrl}/admin/configs`, data)
    )
  }

  public async updateConfig(configId: number, data: SsoConfigArgUpdate) {
    return this.request(
      this.$axios.patch<AppResponse<SsoConfig>>(`${this.moduleUrl}/admin/configs/${configId}`, data)
    )
  }

  public async deleteConfig(configId: number) {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/admin/configs/${configId}`)
    )
  }

  public async parseMetadata(url: string) {
    return this.request(
      this.$axios.get<AppResponse<{ samlEntryPoint: string, samlCert: string, samlLogoutUrl: string }>>(`${this.moduleUrl}/admin/metadata`, {
        params: { url },
      })
    )
  }

  public async checkDomain(domain: string) {
    return this.request(
      this.$axios.get<AppResponse<SsoProviderPublic | null>>(`${this.moduleUrl}/providers`, {
        params: { domain },
      })
    )
  }
}
