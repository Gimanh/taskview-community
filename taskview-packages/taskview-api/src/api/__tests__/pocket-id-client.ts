import axios, { type AxiosInstance } from 'axios'
import type {
  PocketIdGroupInput,
  PocketIdRenameGroupArgs,
  PocketIdScimProviderArgs,
  PocketIdSetAllowedGroupsArgs,
  PocketIdSetUserGroupsArgs,
  PocketIdSetGroupUsersArgs,
  PocketIdSyncResult,
  PocketIdUpdateUserArgs,
  PocketIdUser,
  PocketIdUserInput,
} from './pocket-id-client.types'

export const POCKET_ID_URL = process.env.POCKET_ID_TEST_URL || 'http://localhost:11411'
// STATIC_API_KEY of the pocket-id service in docker/docker-compose.yml
const POCKET_ID_API_KEY = process.env.POCKET_ID_TEST_API_KEY || 'taskview-test-pocket-id-api-key'

// The admin API of a real Pocket ID instance, used to drive its SCIM client in the tests
export class PocketIdClient {
  private readonly http: AxiosInstance

  constructor() {
    this.http = axios.create({ baseURL: `${POCKET_ID_URL}/api`, headers: { 'X-API-Key': POCKET_ID_API_KEY } })
  }

  async createGroup(input: PocketIdGroupInput): Promise<string> {
    const { data } = await this.http.post('/user-groups', input)
    return data.id
  }

  async renameGroup(args: PocketIdRenameGroupArgs) {
    await this.http.put(`/user-groups/${args.id}`, { name: args.name, friendlyName: args.friendlyName })
  }

  async deleteGroup(id: string) {
    await this.http.delete(`/user-groups/${id}`)
  }

  async setGroupUsers(args: PocketIdSetGroupUsersArgs) {
    await this.http.put(`/user-groups/${args.groupId}/users`, { userIds: args.userIds })
  }

  // Changes the membership from the user page rather than from the group page
  async setUserGroups(args: PocketIdSetUserGroupsArgs) {
    await this.http.put(`/users/${args.userId}/user-groups`, { userGroupIds: args.groupIds })
  }

  async createUser(input: PocketIdUserInput): Promise<PocketIdUser> {
    const { data } = await this.http.post('/users', { ...input, emailVerified: true })
    return { ...input, id: data.id }
  }

  // Pocket ID replaces the whole user on update, so the request carries every field
  async updateUser(args: PocketIdUpdateUserArgs): Promise<PocketIdUser> {
    const next = { ...args.user, ...args.changes }
    await this.http.put(`/users/${next.id}`, {
      username: next.username,
      email: next.email,
      emailVerified: true,
      firstName: next.firstName,
      lastName: next.lastName,
      disabled: !!next.disabled,
    })
    return next
  }

  async deleteUser(id: string) {
    await this.http.delete(`/users/${id}`)
  }

  // A client restricted to one group: only its members are pushed over SCIM
  async createGroupClient(groupId: string): Promise<string> {
    const { data } = await this.http.post('/oidc/clients', {
      name: `taskview-${groupId.slice(0, 8)}`,
      callbackURLs: ['http://localhost/callback'],
      isGroupRestricted: true,
    })
    await this.setAllowedGroups({ clientId: data.id, groupIds: [groupId] })
    return data.id
  }

  async setAllowedGroups(args: PocketIdSetAllowedGroupsArgs) {
    await this.http.put(`/oidc/clients/${args.clientId}/allowed-user-groups`, { userGroupIds: args.groupIds })
  }

  async deleteClient(id: string) {
    await this.http.delete(`/oidc/clients/${id}`)
  }

  async createScimProvider(args: PocketIdScimProviderArgs): Promise<string> {
    const { data } = await this.http.post('/scim/service-provider', args)
    return data.id
  }

  async deleteScimProvider(id: string) {
    await this.http.delete(`/scim/service-provider/${id}`)
  }

  // Answers once the sync has finished; a failed request inside the sync makes it answer with an error
  async sync(providerId: string): Promise<PocketIdSyncResult> {
    const res = await this.http.post(`/scim/service-provider/${providerId}/sync`, undefined, { validateStatus: () => true })
    return { status: res.status, body: res.data }
  }
}
