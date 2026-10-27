import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type {
  SsoArgLinkScimGroupProject,
  SsoArgParseMetadata,
  SsoArgUnlinkScimGroupProject,
  SsoParsedMetadata,
  SsoConfig,
  SsoConfigArgCreate,
  SsoConfigArgUpdate,
  SsoDomainVerificationCheck,
  SsoDomainVerificationStart,
  SsoProviderPublic,
  SsoPublicUrls,
  SsoScimGroupsOverview,
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

  public async getPublicUrls() {
    return this.request(
      this.$axios.get<AppResponse<SsoPublicUrls>>(`${this.moduleUrl}/admin/public-urls`)
    )
  }

  public async parseMetadata(args: SsoArgParseMetadata) {
    return this.request(
      this.$axios.get<AppResponse<SsoParsedMetadata>>(`${this.moduleUrl}/admin/metadata`, {
        params: { url: args.url, organizationId: args.organizationId },
      })
    )
  }

  public async generateScimToken(configId: number) {
    return this.request(
      this.$axios.post<AppResponse<{ token: string }>>(`${this.moduleUrl}/admin/configs/${configId}/scim-token`)
    )
  }

  public async toggleScim(configId: number, enabled: boolean) {
    return this.request(
      this.$axios.patch<AppResponse<{ scimEnabled: number }>>(`${this.moduleUrl}/admin/configs/${configId}/scim`, { enabled })
    )
  }

  public async fetchScimGroups(configId: number) {
    return this.request(
      this.$axios.get<AppResponse<SsoScimGroupsOverview>>(`${this.moduleUrl}/admin/configs/${configId}/scim-groups`)
    )
  }

  public async linkScimGroupProject(args: SsoArgLinkScimGroupProject) {
    return this.request(
      this.$axios.put<AppResponse<boolean>>(
        `${this.moduleUrl}/admin/configs/${args.configId}/scim-groups/${args.groupId}/projects/${args.goalId}`,
        { roleId: args.roleId },
      )
    )
  }

  public async unlinkScimGroupProject(args: SsoArgUnlinkScimGroupProject) {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(
        `${this.moduleUrl}/admin/configs/${args.configId}/scim-groups/${args.groupId}/projects/${args.goalId}`,
      )
    )
  }

  public async startDomainVerification(configId: number) {
    return this.request(
      this.$axios.post<AppResponse<SsoDomainVerificationStart>>(`${this.moduleUrl}/admin/configs/${configId}/verify-domain`)
    )
  }

  public async checkDomainVerification(configId: number) {
    return this.request(
      this.$axios.post<AppResponse<SsoDomainVerificationCheck>>(`${this.moduleUrl}/admin/configs/${configId}/verify-domain/check`)
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
