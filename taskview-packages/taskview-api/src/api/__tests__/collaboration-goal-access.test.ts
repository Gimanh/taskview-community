import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'

/**
 * GET /module/collaboration/:goalId must be an object-level protected route:
 * only a member of the goal holding task_can_assign_users or goal_can_manage_users
 * may read its collaborator list (emails, invitation dates, roles, goalOwner flag).
 */
describe('Collaboration goal member list access control', () => {
  let ownerApi: TvApi
  let outsiderApi: TvApi
  let outsiderEmail: string
  let deleteAllGoals: () => Promise<void>
  let manageUsersPermissionId: number
  const permissionIdByName = new Map<string, number>()

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    outsiderApi = init.$tvApiForSecondUser
    outsiderEmail = init.user2Email
    deleteAllGoals = init.deleteAllGoals

    const allPermissions = await ownerApi.collaboration.fetchAllPermissions()
    for (const permission of allPermissions) {
      permissionIdByName.set(permission.name, permission.id)
    }
    const found = permissionIdByName.get(TvPermissions.GOAL_CAN_MANAGE_USERS)
    if (!found) throw new Error('Permission "goal_can_manage_users" is not in DB')
    manageUsersPermissionId = found
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  async function expectHttpStatus<T>(promise: Promise<T>, status: number): Promise<void> {
    try {
      await promise
      throw new Error(`Expected HTTP ${status} but request succeeded`)
    } catch (e: any) {
      if (typeof e.message === 'string' && e.message.startsWith('Expected HTTP')) throw e
      expect(e.response?.status ?? e.status, `Expected ${status}, got ${e.response?.status ?? e.status}`).toBe(status)
    }
  }

  // A goal owned by user1 that user2 is NOT a member of, holding a third-party email
  async function createPrivateGoal(organizationId?: number) {
    const goal = await ownerApi.goals.createGoal({
      name: `Private goal ${Date.now()}`,
      ...(organizationId ? { organizationId } : {}),
    })
    if (!goal) throw new Error('Failed to create goal')

    const invitedEmail = `outside-party-${Date.now()}@test.com`
    const invited = await ownerApi.collaboration.inviteUserToGoal({ email: invitedEmail, goalId: goal.id })
    if (!invited) throw new Error('Failed to invite third-party email')

    return { goal, invitedEmail }
  }

  // Invite user2 into user1's goal and grant a role carrying goal_can_manage_users
  async function shareGoalWithOutsider() {
    const goal = await ownerApi.goals.createGoal({ name: `Shared goal ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')

    const collab = await ownerApi.collaboration.inviteUserToGoal({ email: outsiderEmail, goalId: goal.id })
    if (!collab) throw new Error('Failed to invite user2')

    const role = await ownerApi.collaboration.createRoleForGoal({
      goalId: goal.id,
      roleName: `Manager ${Date.now()}`,
    })
    if (!role) throw new Error('Failed to create role')

    const toggled = await ownerApi.collaboration.toggleRolePermission({
      roleId: role.id,
      permissionId: manageUsersPermissionId,
    })
    if (!toggled || toggled.add !== true) {
      throw new Error(`Expected goal_can_manage_users to be added, got ${JSON.stringify(toggled)}`)
    }

    await ownerApi.collaboration.toggleUserRoles({
      goalId: goal.id,
      userId: collab.id,
      roles: [role.id],
    })

    return { goal, role, collab }
  }

  describe('JWT session of a non-member', () => {
    it('cannot read the collaborator list of someone else goal', async () => {
      const { goal } = await createPrivateGoal()

      await expectHttpStatus(outsiderApi.collaboration.fetchUsersForGoal(goal.id), 403)
    })

    it('cannot enumerate collaborator emails by walking goal ids', async () => {
      const { goal, invitedEmail } = await createPrivateGoal()

      let leaked: Awaited<ReturnType<typeof outsiderApi.collaboration.fetchUsersForGoal>> | null = null
      try {
        leaked = await outsiderApi.collaboration.fetchUsersForGoal(goal.id)
      } catch {
        return
      }

      expect(
        leaked ?? [],
        `Leaked collaborator list of goal ${goal.id}: ${JSON.stringify(leaked)}`,
      ).toEqual([])
      expect((leaked ?? []).some(u => u.email === invitedEmail)).toBe(false)
      expect((leaked ?? []).some(u => u.goalOwner)).toBe(false)
    })

    it('gets the same rejection for a goal id that does not exist', async () => {
      const nonExistentGoalId = 999999999

      await expectHttpStatus(outsiderApi.collaboration.fetchUsersForGoal(nonExistentGoalId), 403)
    })
  })

  describe('Organization boundary', () => {
    it('a member of the same organization who is not a member of the goal is still rejected', async () => {
      const org = await ownerApi.organizations.create({ name: `Access org ${Date.now()}` })
      if (!org) throw new Error('Failed to create organization')

      const added = await ownerApi.organizations.addMember({
        organizationId: org.id,
        email: outsiderEmail,
        role: 'member',
      })
      if (!added) throw new Error('Failed to add user2 to the organization')

      // The goal lives in the shared org, but user2 was never invited into the goal itself
      const { goal } = await createPrivateGoal(org.id)

      await expectHttpStatus(outsiderApi.collaboration.fetchUsersForGoal(goal.id), 403)
    })
  })

  describe('Unauthenticated access', () => {
    it('is rejected with 401 rather than served', async () => {
      const { goal } = await createPrivateGoal()

      const response = await axios.get(`${API_URL}/module/collaboration/${goal.id}`, {
        validateStatus: () => true,
      })

      expect(
        response.status,
        `Anonymous request returned ${response.status}: ${JSON.stringify(response.data)}`,
      ).toBe(401)
    })
  })

  describe('API token of a non-member', () => {
    it('cannot read the collaborator list of someone else goal', async () => {
      const created = await outsiderApi.apiTokens.create({ name: `Access probe ${Date.now()}` })
      if (!created) throw new Error('Failed to create API token for user2')

      const tokenApi = new TvApi(axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${created.token}` },
      }))

      const { goal } = await createPrivateGoal()

      try {
        await expectHttpStatus(tokenApi.collaboration.fetchUsersForGoal(goal.id), 403)
      } finally {
        await outsiderApi.apiTokens.delete(created.item.id)
      }
    })

    it('cannot read a goal that is outside the token allowedGoalIds scope', async () => {
      const ownGoal = await outsiderApi.goals.createGoal({ name: `User2 goal ${Date.now()}` })
      if (!ownGoal) throw new Error('Failed to create user2 goal')

      // Token is explicitly scoped to user2's own goal only
      const created = await outsiderApi.apiTokens.create({
        name: `Scoped probe ${Date.now()}`,
        allowedGoalIds: [ownGoal.id],
      })
      if (!created) throw new Error('Failed to create scoped API token for user2')

      const tokenApi = new TvApi(axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${created.token}` },
      }))

      const { goal } = await createPrivateGoal()

      try {
        await expectHttpStatus(tokenApi.collaboration.fetchUsersForGoal(goal.id), 403)
      } finally {
        await outsiderApi.apiTokens.delete(created.item.id)
      }
    })
  })

  describe('Legitimate access is preserved', () => {
    it('the goal owner can read the collaborator list', async () => {
      const { goal, invitedEmail } = await createPrivateGoal()

      const users = await ownerApi.collaboration.fetchUsersForGoal(goal.id)
      expect(users).toBeDefined()
      expect(users?.some(u => u.email === invitedEmail)).toBe(true)
    })

    it('a member with goal_can_manage_users can read the collaborator list', async () => {
      const { goal } = await shareGoalWithOutsider()

      const users = await outsiderApi.collaboration.fetchUsersForGoal(goal.id)
      expect(users).toBeDefined()
      expect(users?.some(u => u.email === outsiderEmail)).toBe(true)
    })

    /**
     * A rank-and-file member must still see the project roster, otherwise the UI
     * cannot render task assignees. Both default roles created by the goal trigger
     * (editor and executor, migration 1.6.1/5.default-roles-for-project.sql) carry
     * task_can_watch_assigned_users, so this is the common case, not an edge one.
     */
    it('a member with only task_can_watch_assigned_users can read the collaborator list', async () => {
      const goal = await ownerApi.goals.createGoal({ name: `Executor goal ${Date.now()}` })
      if (!goal) throw new Error('Failed to create goal')

      const collab = await ownerApi.collaboration.inviteUserToGoal({ email: outsiderEmail, goalId: goal.id })
      if (!collab) throw new Error('Failed to invite user2')

      const roles = await ownerApi.collaboration.fetchRolesForGoal(goal.id)
      const executor = roles?.find(r => r.name === 'executor')
      if (!executor) throw new Error('Default "executor" role is missing on a fresh goal')

      // the role grants the watch permission and neither of the two management ones,
      // so a pass here can only come from task_can_watch_assigned_users
      const matrix = await ownerApi.collaboration.fetchRoleToPermissionsForGoal(goal.id)
      const executorPermissionIds = (matrix ?? [])
        .filter(row => row.roleId === executor.id)
        .map(row => row.permissionId)
      expect(executorPermissionIds).toContain(permissionIdByName.get(TvPermissions.TASK_CAN_WATCH_ASSIGNED_USERS))
      expect(executorPermissionIds).not.toContain(permissionIdByName.get(TvPermissions.GOAL_CAN_MANAGE_USERS))
      expect(executorPermissionIds).not.toContain(permissionIdByName.get(TvPermissions.TASK_CAN_ASSIGN_USERS))

      await ownerApi.collaboration.toggleUserRoles({
        goalId: goal.id,
        userId: collab.id,
        roles: [executor.id],
      })

      const users = await outsiderApi.collaboration.fetchUsersForGoal(goal.id)
      expect(users).toBeDefined()
      expect(users?.some(u => u.email === outsiderEmail)).toBe(true)
    })

    it('a member whose role carries none of the three permissions is rejected', async () => {
      const goal = await ownerApi.goals.createGoal({ name: `Bare role goal ${Date.now()}` })
      if (!goal) throw new Error('Failed to create goal')

      const collab = await ownerApi.collaboration.inviteUserToGoal({ email: outsiderEmail, goalId: goal.id })
      if (!collab) throw new Error('Failed to invite user2')

      // a freshly created custom role carries no permissions at all
      const bareRole = await ownerApi.collaboration.createRoleForGoal({
        goalId: goal.id,
        roleName: `Bare ${Date.now()}`,
      })
      if (!bareRole) throw new Error('Failed to create role')

      await ownerApi.collaboration.toggleUserRoles({
        goalId: goal.id,
        userId: collab.id,
        roles: [bareRole.id],
      })

      await expectHttpStatus(outsiderApi.collaboration.fetchUsersForGoal(goal.id), 403)
    })
  })

  describe('Revoked access', () => {
    it('a removed collaborator loses access to the collaborator list', async () => {
      const { goal, collab } = await shareGoalWithOutsider()

      // sanity: access is real before removal
      const before = await outsiderApi.collaboration.fetchUsersForGoal(goal.id)
      expect(before?.some(u => u.email === outsiderEmail)).toBe(true)

      const removed = await ownerApi.collaboration.deleteUserFromGoal({ goalId: goal.id, id: collab.id })
      expect(removed).toBeTruthy()

      await expectHttpStatus(outsiderApi.collaboration.fetchUsersForGoal(goal.id), 403)
    })
  })
})
