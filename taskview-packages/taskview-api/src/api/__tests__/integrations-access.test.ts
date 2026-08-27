import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import axios, { type AxiosInstance } from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, DEFAULT_PASSWORD, DEFAULT_USER_2, initApi } from './init-api'

/**
 * The integrations guards resolve the project to authorize against via
 * resolveProjectId(), which prefers a projectId supplied by the caller over the
 * one derived from integrationId. The handlers, however, act on integrationId.
 * A caller must not be able to pass a project they own alongside someone else's
 * integration id and have the guard authorize the wrong object.
 */
describe('Integrations object-level access control', () => {
  let ownerApi: TvApi
  let outsiderApi: TvApi
  let deleteAllGoals: () => Promise<void>
  let outsiderEmail: string
  let attackerAxios: AxiosInstance
  let victimGoalId: number
  let attackerGoalId: number

  beforeAll(async () => {
    const init = await initApi()
    ownerApi = init.$tvApi
    outsiderApi = init.$tvApiForSecondUser
    deleteAllGoals = init.deleteAllGoals
    outsiderEmail = init.user2Email

    const auth = await axios.post(`${API_URL}/module/auth/login`, {
      login: DEFAULT_USER_2,
      password: DEFAULT_PASSWORD,
    })
    attackerAxios = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${auth.data.access}` },
      validateStatus: () => true,
    })

    const victimGoal = await ownerApi.goals.createGoal({ name: `Victim project ${Date.now()}` })
    if (!victimGoal) throw new Error('Failed to create victim goal')
    victimGoalId = victimGoal.id

    const attackerGoal = await outsiderApi.goals.createGoal({ name: `Attacker project ${Date.now()}` })
    if (!attackerGoal) throw new Error('Failed to create attacker goal')
    attackerGoalId = attackerGoal.id
  })

  afterAll(async () => {
    await deleteAllGoals()
  })

  async function createVictimIntegration(): Promise<number> {
    const created = await ownerApi.integrations.createIntegration({
      provider: 'github',
      repoFullName: `victim-org/private-repo-${Date.now()}`,
      projectId: victimGoalId,
    })
    if (!created) throw new Error('Failed to create victim integration')
    return created.id
  }

  async function victimIntegrationExists(integrationId: number): Promise<boolean> {
    const list = await ownerApi.integrations.fetchIntegrations(victimGoalId)
    return (list ?? []).some(i => i.id === integrationId)
  }

  it('rejects deleting another user integration even when a self-owned projectId is supplied', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.delete('/module/integrations', {
      data: { id: integrationId, projectId: attackerGoalId },
    })

    // impact first, mechanism second — so a failure reports whether data was actually destroyed
    expect(
      await victimIntegrationExists(integrationId),
      `victim integration ${integrationId} was destroyed by a non-member`,
    ).toBe(true)
    expect(
      response.status,
      `Guard authorized project ${attackerGoalId} while the handler acted on integration ${integrationId}`,
    ).toBe(403)
  })

  it('rejects toggling another user integration even when a self-owned projectId is supplied', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.patch('/module/integrations/toggle', {
      id: integrationId,
      isActive: false,
      projectId: attackerGoalId,
    })

    expect(response.status).toBe(403)
  })

  it('rejects reading another user integration repos even when a self-owned projectId is supplied', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.get('/module/integrations/repos', {
      params: { integrationId, projectId: attackerGoalId },
    })

    expect(response.status).toBe(403)
  })

  it('rejects syncing another user integration even when a self-owned projectId is supplied', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.post('/module/integrations/sync', {
      integrationId,
      projectId: attackerGoalId,
    })

    expect(response.status).toBe(403)
  })

  it('control: without the injected projectId the guard already rejects the same request', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.delete('/module/integrations', {
      data: { id: integrationId },
    })

    expect(response.status).toBe(403)
    expect(await victimIntegrationExists(integrationId)).toBe(true)
  })

  // select-repo is the most consequential handler of the four: besides writing to
  // the integration it kicks off syncIssues() and registerWebhook() against the repo
  it('rejects selecting a repo on another user integration even when a self-owned projectId is supplied', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.patch('/module/integrations/select-repo', {
      integrationId,
      repoFullName: 'attacker-org/planted-repo',
      repoExternalId: '424242',
      projectId: attackerGoalId,
    })

    expect(response.status).toBe(403)
  })

  // resolveProjectId reads projectId from the query string too, so a fix that only
  // hardens the body would still leave this door open
  it('rejects the same bypass when projectId arrives via the query string', async () => {
    const integrationId = await createVictimIntegration()

    const response = await attackerAxios.delete('/module/integrations', {
      params: { projectId: attackerGoalId },
      data: { id: integrationId },
    })

    expect(
      await victimIntegrationExists(integrationId),
      `victim integration ${integrationId} was destroyed via a query-string projectId`,
    ).toBe(true)
    expect(response.status).toBe(403)
  })

  it('rejects listing the integrations of a project the caller is not a member of', async () => {
    await createVictimIntegration()

    const response = await attackerAxios.get('/module/integrations', {
      params: { projectId: victimGoalId },
    })

    expect(
      response.status,
      `Leaked integrations of project ${victimGoalId}: ${JSON.stringify(response.data)}`,
    ).toBe(403)
  })

  it('rejects planting a new integration into a project the caller is not a member of', async () => {
    const response = await attackerAxios.post('/module/integrations', {
      provider: 'github',
      repoFullName: 'attacker-org/planted-repo',
      projectId: victimGoalId,
    })

    expect(response.status).toBe(403)
  })

  it('control: the owner can still manage their own integration', async () => {
    const integrationId = await createVictimIntegration()

    const deleted = await ownerApi.integrations.deleteIntegration(integrationId)
    expect(deleted).toBeTruthy()
    expect(await victimIntegrationExists(integrationId)).toBe(false)
  })

  // guards against an over-strict fix: a project member holding integrations_can_manage
  // must keep working, not just the goal owner
  it('control: a project member with integrations_can_manage can delete the integration', async () => {
    const goal = await ownerApi.goals.createGoal({ name: `Shared integrations ${Date.now()}` })
    if (!goal) throw new Error('Failed to create goal')

    const collab = await ownerApi.collaboration.inviteUserToGoal({ email: outsiderEmail, goalId: goal.id })
    if (!collab) throw new Error('Failed to invite user2')

    const allPermissions = await ownerApi.collaboration.fetchAllPermissions()
    const managePermission = allPermissions.find(p => p.name === TvPermissions.INTEGRATIONS_CAN_MANAGE)
    if (!managePermission) throw new Error('Permission "integrations_can_manage" is not in DB')

    const role = await ownerApi.collaboration.createRoleForGoal({
      goalId: goal.id,
      roleName: `Integrator ${Date.now()}`,
    })
    if (!role) throw new Error('Failed to create role')

    const toggled = await ownerApi.collaboration.toggleRolePermission({
      roleId: role.id,
      permissionId: managePermission.id,
    })
    if (!toggled || toggled.add !== true) {
      throw new Error(`Expected integrations_can_manage to be added, got ${JSON.stringify(toggled)}`)
    }

    await ownerApi.collaboration.toggleUserRoles({
      goalId: goal.id,
      userId: collab.id,
      roles: [role.id],
    })

    const created = await ownerApi.integrations.createIntegration({
      provider: 'github',
      repoFullName: `shared-org/repo-${Date.now()}`,
      projectId: goal.id,
    })
    if (!created) throw new Error('Failed to create integration')

    const deleted = await outsiderApi.integrations.deleteIntegration(created.id)
    expect(deleted).toBeTruthy()
  })
})
