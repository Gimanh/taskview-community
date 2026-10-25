import type { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'

/**
 * Default roles a new project is created with. timetracking_can_manage_all does not
 * include logging own time, so the editor role carries timetracking_can_log itself.
 */
describe('Default roles of a new project', () => {
  let api: TvApi
  let goalId: number
  let permissionIdByName: Map<string, number>

  beforeAll(async () => {
    api = (await initApi()).$tvApi
    const goal = await api.goals.createGoal({ name: `default-roles-${Date.now()}` })
    goalId = goal!.id!
    const catalogue = await api.collaboration.fetchAllPermissions()
    permissionIdByName = new Map(catalogue!.map((p) => [p.name, p.id]))
  })

  afterAll(async () => {
    await api.goals.deleteGoal(goalId).catch(() => {})
  })

  async function rolePermissionNames(roleName: string): Promise<string[]> {
    const role = (await api.collaboration.fetchRolesForGoal(goalId))!.find((r) => r.name === roleName)
    const matrix = await api.collaboration.fetchRoleToPermissionsForGoal(goalId)
    const ids = matrix!.filter((r) => r.roleId === role!.id).map((r) => r.permissionId)
    return [...permissionIdByName].filter(([, id]) => ids.includes(id)).map(([name]) => name)
  }

  it('lets the editor view, log and manage time', async () => {
    const names = await rolePermissionNames('editor')

    expect(names).toEqual(expect.arrayContaining([
      TvPermissions.TIMETRACKING_CAN_VIEW,
      TvPermissions.TIMETRACKING_CAN_LOG,
      TvPermissions.TIMETRACKING_CAN_MANAGE_ALL,
    ]))
  })

  it('keeps the executor on view and log only', async () => {
    const names = await rolePermissionNames('executor')

    expect(names).toEqual(expect.arrayContaining([TvPermissions.TIMETRACKING_CAN_VIEW, TvPermissions.TIMETRACKING_CAN_LOG]))
    expect(names).not.toContain(TvPermissions.TIMETRACKING_CAN_MANAGE_ALL)
  })
})
