import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type {
  Organization,
  OrganizationArgCreate,
  OrganizationArgUpdate,
  OrgMember,
  OrgMemberArgAdd,
  OrgMemberArgUpdateRole,
  OrgMemberArgRemove,
} from './organizations.types'

export default class TvOrganizationsApi extends TvApiBase {
  protected moduleUrl = '/module/organizations'

  public async fetch() {
    return this.request(
      this.$axios.get<AppResponse<Organization[]>>(this.moduleUrl)
    )
  }

  public async getById(orgId: number) {
    return this.request(
      this.$axios.get<AppResponse<Organization>>(`${this.moduleUrl}/${orgId}`)
    )
  }

  public async create(data: OrganizationArgCreate) {
    return this.request(
      this.$axios.post<AppResponse<Organization>>(this.moduleUrl, data)
    )
  }

  public async update(orgId: number, data: Omit<OrganizationArgUpdate, 'organizationId'>) {
    return this.request(
      this.$axios.patch<AppResponse<Organization>>(`${this.moduleUrl}/${orgId}`, data)
    )
  }

  public async delete(orgId: number) {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/${orgId}`)
    )
  }

  public async fetchMembers(orgId: number) {
    return this.request(
      this.$axios.get<AppResponse<OrgMember[]>>(`${this.moduleUrl}/${orgId}/members`)
    )
  }

  public async addMember(data: OrgMemberArgAdd) {
    return this.request(
      this.$axios.post<AppResponse<OrgMember>>(`${this.moduleUrl}/members`, data)
    )
  }

  public async updateMemberRole(data: OrgMemberArgUpdateRole) {
    return this.request(
      this.$axios.patch<AppResponse<OrgMember>>(`${this.moduleUrl}/members/role`, data)
    )
  }

  public async removeMember(data: OrgMemberArgRemove) {
    return this.request(
      this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/members`, { data })
    )
  }
}
