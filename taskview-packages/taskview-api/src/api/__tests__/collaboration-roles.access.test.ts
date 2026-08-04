import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'

describe('Collaboration roles access control', () => {
  let user1Api: TvApi
  let user2Api: TvApi
  let user2Email: string
  let deleteAllGoals: () => Promise<void>
  let manageUsersPermissionId: number

  beforeAll(async () => {
    const init = await initApi()
    user1Api = init.$tvApi
    user2Api = init.$tvApiForSecondUser
    user2Email = init.user2Email
    deleteAllGoals = init.deleteAllGoals

    const allPermissions = await user1Api.collaboration.fetchAllPermissions()
    const found = allPermissions.find(p => p.name === TvPermissions.GOAL_CAN_MANAGE_USERS)
    if (!found) throw new Error('Permission "goal_can_manage_users" is not in DB')
    manageUsersPermissionId = found.id
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
      expect(e.response?.status, `Expected ${status}, got ${e.response?.status}`).toBe(status)
    }
  }

  async function createGoalWithUser2(grantManageUsers: boolean) {
    const goal = await user1Api.goals.createGoal({ name: `Roles access ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')

    const collab = await user1Api.collaboration.inviteUserToGoal({ email: user2Email, goalId: goal.id })
    if (!collab) throw new Error('Failed to invite user2')

    const role = await user1Api.collaboration.createRoleForGoal({
      goalId: goal.id,
      roleName: `Manager ${Date.now()}`,
    })
    if (!role) throw new Error('Failed to create role')

    if (grantManageUsers) {
      const toggled = await user1Api.collaboration.toggleRolePermission({
        roleId: role.id,
        permissionId: manageUsersPermissionId,
      })
      if (!toggled || toggled.add !== true) {
        throw new Error(`Expected goal_can_manage_users to be added, got ${JSON.stringify(toggled)}`)
      }
    }

    await user1Api.collaboration.toggleUserRoles({
      goalId: goal.id,
      userId: collab.id,
      roles: [role.id],
    })

    return { goal, role }
  }

  it('collaborator with goal_can_manage_users can read the role-to-permission matrix', async () => {
    const { goal, role } = await createGoalWithUser2(true)

    const matrix = await user2Api.collaboration.fetchRoleToPermissionsForGoal(goal.id)
    expect(matrix).toBeDefined()
    // the granted permission is visible in the matrix of the role user2 holds
    expect(matrix?.some(row => row.roleId === role.id && row.permissionId === manageUsersPermissionId)).toBe(true)
  })

  it('collaborator without goal_can_manage_users cannot read the matrix', async () => {
    const { goal } = await createGoalWithUser2(false)

    await expectHttpStatus(user2Api.collaboration.fetchRoleToPermissionsForGoal(goal.id), 403)
  })

  it('changing role permissions stays owner-only', async () => {
    const { goal, role } = await createGoalWithUser2(true)

    // reading is allowed...
    const matrix = await user2Api.collaboration.fetchRoleToPermissionsForGoal(goal.id)
    expect(matrix).toBeDefined()

    // ...but editing the matrix is not
    await expectHttpStatus(
      user2Api.collaboration.toggleRolePermission({ roleId: role.id, permissionId: manageUsersPermissionId }),
      403,
    )

    // owner still can edit
    const ownerToggle = await user1Api.collaboration.toggleRolePermission({
      roleId: role.id,
      permissionId: manageUsersPermissionId,
    })
    expect(ownerToggle?.add).toBe(false)

    await expect(user1Api.goals.deleteGoal(goal.id)).resolves.toBeTruthy()
  })
})
