import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import axios from 'axios'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { API_URL, initApi } from './init-api'

describe('Analytics access control', () => {
  let user1Api: TvApi
  let user2Api: TvApi
  let user2Email: string
  let user1AuthHeader: string
  let deleteAllGoals: () => Promise<void>
  let analyticsPermissionId: number
  const createdOrgIds: number[] = []
  const createdApiTokenIds: number[] = []

  beforeAll(async () => {
    const init = await initApi()
    user1Api = init.$tvApi
    user2Api = init.$tvApiForSecondUser
    user2Email = init.user2Email
    deleteAllGoals = init.deleteAllGoals
    user1AuthHeader = user1Api['$axios'].defaults.headers.common['Authorization'] as string

    const allPermissions = await user1Api.collaboration.fetchAllPermissions()
    const found = allPermissions.find(p => p.name === TvPermissions.ANALYTICS_CAN_VIEW)
    if (!found) {
      throw new Error(
        'Permission "analytics_can_view" is not in DB. '
        + 'Run migration 1.46.0/0.add-analytics-permission.sql.',
      )
    }
    analyticsPermissionId = found.id
  })

  afterAll(async () => {
    await deleteAllGoals()
    for (const id of createdApiTokenIds) {
      await user1Api.apiTokens.delete(id).catch(() => {})
    }
    for (const orgId of createdOrgIds) {
      await user1Api.organizations.delete(orgId).catch(() => {})
      await user2Api.organizations.delete(orgId).catch(() => {})
    }
  })

  async function expectHttpStatus<T>(promise: Promise<T>, status: number): Promise<void> {
    try {
      await promise
      throw new Error(`Expected HTTP ${status} but request succeeded`)
    } catch (e: any) {
      if (typeof e.message === 'string' && e.message.startsWith('Expected HTTP')) throw e
      const actual = e.response?.status
      expect(actual, `Expected ${status}, got ${actual}`).toBe(status)
    }
  }

  /**
   * Create a fresh org owned by user1, with two projects.
   * user2 is added as a member (no analytics permission yet).
   */
  async function setupSharedOrg(label: string) {
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const org = await user1Api.organizations.create({ name: `Analytics ${label} ${ts}` })
    createdOrgIds.push(org.id)

    const projectA = await user1Api.goals.createGoal({
      name: `Project A ${ts}`,
      organizationId: org.id,
    })
    const projectB = await user1Api.goals.createGoal({
      name: `Project B ${ts}`,
      organizationId: org.id,
    })

    if (!projectA || !projectB) throw new Error('Failed to create project goals')

    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'member',
    })

    return { orgId: org.id, projectA, projectB }
  }

  /**
   * Grant `analytics_can_view` permission on `goalId` to user2.
   * Verifies the toggle actually turned the permission ON (defends against
   * future regression if `createRoleForGoal` ever ships with default permissions).
   */
  async function grantAnalyticsViewToUser2(goalId: number) {
    const collab = await user1Api.collaboration.inviteUserToGoal({
      email: user2Email,
      goalId,
    })
    if (!collab) throw new Error('Failed to invite user2 as collaborator')

    const role = await user1Api.collaboration.createRoleForGoal({
      goalId,
      roleName: `Analytics Viewer ${Date.now()}`,
    })
    if (!role) throw new Error('Failed to create role')

    const toggleResult = await user1Api.collaboration.toggleRolePermission({
      roleId: role.id,
      permissionId: analyticsPermissionId,
    })
    if (!toggleResult || toggleResult.add !== true) {
      throw new Error(
        `Expected toggleRolePermission to add the permission (add=true), got ${JSON.stringify(toggleResult)}. `
        + 'This likely means createRoleForGoal now ships with default permissions; tests need to be updated.',
      )
    }

    await user1Api.collaboration.toggleUserRoles({
      goalId,
      userId: collab.id,
      roles: [role.id],
    })
  }

  describe('Authentication (HTTP 401 / 403)', () => {
    it('anonymous request → 401', async () => {
      const noAuth = axios.create({ baseURL: API_URL })
      await expectHttpStatus(
        noAuth.get('/module/analytics/sections', {
          params: { scope: 'org', organizationId: 1, period: '30d' },
        }),
        401,
      )
    })

    it('API-token request → 403 (RejectApiTokenAuth)', async () => {
      const created = await user1Api.apiTokens.create({ name: `Analytics test ${Date.now()}` })
      if (!created?.token) throw new Error('Failed to create API token')
      createdApiTokenIds.push(created.item.id)

      const tokenAxios = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${created.token}` },
      })

      // Need a real organizationId for the token user; use any (middleware order
      // checks RejectApiTokenAuth before org membership)
      await expectHttpStatus(
        tokenAxios.get('/module/analytics/sections', {
          params: { scope: 'org', organizationId: 1, period: '30d' },
        }),
        403,
      )
    })
  })

  describe('Validation (HTTP 400)', () => {
    it('rejects request without organizationId', async () => {
      await expectHttpStatus(
        // @ts-expect-error -- intentionally missing organizationId
        user1Api.analytics.fetchSections({ scope: { kind: 'org' }, period: '30d' }),
        400,
      )
    })

    it('rejects scope=project without goalId', async () => {
      const { orgId } = await setupSharedOrg('val-no-goal')
      await expectHttpStatus(
        user1Api.analytics.fetchSections({
          // @ts-expect-error -- intentionally missing goalId
          scope: { kind: 'project' },
          organizationId: orgId,
          period: '30d',
        }),
        400,
      )
    })

    it('rejects unknown period via raw HTTP', async () => {
      const { orgId } = await setupSharedOrg('val-bad-period')
      await expectHttpStatus(
        axios.get(`${API_URL}/module/analytics/sections`, {
          headers: { Authorization: user1AuthHeader },
          params: { scope: 'org', organizationId: orgId, period: 'foo' },
        }),
        400,
      )
    })
  })

  describe('Org membership (HTTP 403)', () => {
    it('non-member of org cannot access analytics', async () => {
      const tsOther = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const otherOrg = await user2Api.organizations.create({ name: `User2 Org ${tsOther}` })
      createdOrgIds.push(otherOrg.id)

      await expectHttpStatus(
        user1Api.analytics.fetchSections({
          scope: { kind: 'org' },
          organizationId: otherOrg.id,
          period: '30d',
        }),
        403,
      )
    })
  })

  describe('Org owner — sees all org projects', () => {
    it('owner gets all org goals in availableGoals (scope=org)', async () => {
      const { orgId, projectA, projectB } = await setupSharedOrg('owner-org')
      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'org' },
        organizationId: orgId,
        period: '30d',
      })
      const goalIds = result.availableGoals.map(g => g.id).sort()
      expect(goalIds).toContain(projectA.id)
      expect(goalIds).toContain(projectB.id)
    })

    it('owner of org with no projects → 200 with empty availableGoals', async () => {
      const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const emptyOrg = await user1Api.organizations.create({ name: `Empty Org ${ts}` })
      createdOrgIds.push(emptyOrg.id)

      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'org' },
        organizationId: emptyOrg.id,
        period: '30d',
      })
      expect(result.availableGoals).toEqual([])
    })

    it('owner can fetch project-scoped sections for projectA', async () => {
      const { orgId, projectA } = await setupSharedOrg('owner-projA')
      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '30d',
      })
      expect(result).toBeTruthy()
      expect(result.scope).toEqual({ kind: 'project', goalId: projectA.id })
    })

    it('owner can fetch project-scoped sections for projectB', async () => {
      const { orgId, projectB } = await setupSharedOrg('owner-projB')
      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectB.id },
        organizationId: orgId,
        period: '30d',
      })
      expect(result.scope).toEqual({ kind: 'project', goalId: projectB.id })
    })

    it('respects period filter (smoke for 7d)', async () => {
      const { orgId, projectA } = await setupSharedOrg('owner-7d')
      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '7d',
      })
      expect(result.period).toBe('7d')
    })

    it('respects sectionIds filter — returns only requested sections', async () => {
      const { orgId, projectA } = await setupSharedOrg('owner-filter')
      const result = await user1Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '30d',
        sections: ['kpi.overdue'],
      })
      // Either the section is present, or none are (project can be empty),
      // but no other sections than the one requested may appear.
      const ids = new Set(result.sections.map(s => s.id))
      ids.delete('kpi.overdue')
      expect(ids.size).toBe(0)
    })
  })

  describe('Member without analytics_can_view — 403 everywhere', () => {
    it('member, scope=org → 403 (no accessible goals)', async () => {
      const { orgId } = await setupSharedOrg('member-noperm-org')
      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'org' },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })

    it('member, scope=project on owner-only project → 403', async () => {
      const { orgId, projectA } = await setupSharedOrg('member-noperm-project')
      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'project', goalId: projectA.id },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })
  })

  describe('Member who created their own project — automatic access', () => {
    it('member who is owner of a project sees it in analytics without explicit permission', async () => {
      // user1 = owner of org. user2 = member. But here we let an admin create
      // the project so they become its goal owner without needing collab.
      const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const org = await user1Api.organizations.create({ name: `MemberOwner Org ${ts}` })
      createdOrgIds.push(org.id)

      // Promote user2 to admin so they can create a project
      await user1Api.organizations.addMember({
        organizationId: org.id,
        email: user2Email,
        role: 'admin',
      })

      const ownProject = await user2Api.goals.createGoal({
        name: `User2 Owns ${ts}`,
        organizationId: org.id,
      })
      if (!ownProject) throw new Error('Failed to create user2 project')

      // user2 owns this project → fetchPermissionsForGoal returns ALL permissions
      // for goal owner, including ANALYTICS_CAN_VIEW. So user2 can see analytics
      // without an explicit role-based permission grant.
      const result = await user2Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: ownProject.id },
        organizationId: org.id,
        period: '30d',
      })
      expect(result.scope).toEqual({ kind: 'project', goalId: ownProject.id })

      const orgScope = await user2Api.analytics.fetchSections({
        scope: { kind: 'org' },
        organizationId: org.id,
        period: '30d',
      })
      const goalIds = orgScope.availableGoals.map(g => g.id)
      expect(goalIds).toContain(ownProject.id)
    })
  })

  describe('Member with analytics_can_view on projectA only', () => {
    it('member can fetch projectA, but not projectB', async () => {
      const { orgId, projectA, projectB } = await setupSharedOrg('member-perm-A')
      await grantAnalyticsViewToUser2(projectA.id)

      const allowed = await user2Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '30d',
      })
      expect(allowed.scope).toEqual({ kind: 'project', goalId: projectA.id })

      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'project', goalId: projectB.id },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })

    it('member, scope=org → only projectA in availableGoals', async () => {
      const { orgId, projectA, projectB } = await setupSharedOrg('member-perm-org-scope')
      await grantAnalyticsViewToUser2(projectA.id)

      const result = await user2Api.analytics.fetchSections({
        scope: { kind: 'org' },
        organizationId: orgId,
        period: '30d',
      })
      const goalIds = result.availableGoals.map(g => g.id)
      expect(goalIds).toContain(projectA.id)
      expect(goalIds).not.toContain(projectB.id)
    })

    it('member loses access after being removed from the goal collaboration', async () => {
      const { orgId, projectA } = await setupSharedOrg('member-revoke')
      await grantAnalyticsViewToUser2(projectA.id)

      // Sanity: access works before revoke
      const ok = await user2Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '30d',
      })
      expect(ok.scope).toEqual({ kind: 'project', goalId: projectA.id })

      // Revoke: remove user2 from goal collaboration
      const collabUsers = await user1Api.collaboration.fetchUsersForGoal(projectA.id)
      const collabUser = collabUsers.find(u => u.email === user2Email)
      if (!collabUser) throw new Error('user2 should be a collaborator')

      await user1Api.collaboration.deleteUserFromGoal({
        id: collabUser.id,
        goalId: projectA.id,
      })

      // Now access should be denied
      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'project', goalId: projectA.id },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })
  })

  describe('Admin treated like member (no automatic org-wide access)', () => {
    it('admin without permission → 403 on org scope (no accessible goals)', async () => {
      const { orgId } = await setupSharedOrg('admin-noperm')
      await user1Api.organizations.updateMemberRole({
        organizationId: orgId,
        email: user2Email,
        role: 'admin',
      })

      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'org' },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })

    it('admin with permission on projectA only → sees only projectA', async () => {
      const { orgId, projectA, projectB } = await setupSharedOrg('admin-perm-A')
      await user1Api.organizations.updateMemberRole({
        organizationId: orgId,
        email: user2Email,
        role: 'admin',
      })
      await grantAnalyticsViewToUser2(projectA.id)

      const orgResult = await user2Api.analytics.fetchSections({
        scope: { kind: 'org' },
        organizationId: orgId,
        period: '30d',
      })
      const goalIds = orgResult.availableGoals.map(g => g.id)
      expect(goalIds).toContain(projectA.id)
      expect(goalIds).not.toContain(projectB.id)

      await expectHttpStatus(
        user2Api.analytics.fetchSections({
          scope: { kind: 'project', goalId: projectB.id },
          organizationId: orgId,
          period: '30d',
        }),
        403,
      )
    })
  })

  describe('Drill-down access', () => {
    it('drill-down 403 if no permission on the project', async () => {
      const { orgId, projectA } = await setupSharedOrg('drill-noperm')
      await expectHttpStatus(
        user2Api.analytics.fetchDrillDown({
          sectionId: 'kpi.overdue',
          scope: { kind: 'project', goalId: projectA.id },
          organizationId: orgId,
          period: '30d',
          bucket: '',
          datasetId: 'kpi',
          index: 0,
        }),
        403,
      )
    })

    it('drill-down 200 with empty tasks if user has permission but no overdue tasks', async () => {
      const { orgId, projectA } = await setupSharedOrg('drill-perm')
      await grantAnalyticsViewToUser2(projectA.id)

      const result = await user2Api.analytics.fetchDrillDown({
        sectionId: 'kpi.overdue',
        scope: { kind: 'project', goalId: projectA.id },
        organizationId: orgId,
        period: '30d',
        bucket: '',
        datasetId: 'kpi',
        index: 0,
      })
      expect(result.sectionId).toBe('kpi.overdue')
      expect(Array.isArray(result.tasks)).toBe(true)
    })

    it('drill-down with cross-org goalId via member returns empty (no data leak)', async () => {
      const { orgId: orgAId, projectA: projectAOfOrgA } = await setupSharedOrg('drill-cross')
      await grantAnalyticsViewToUser2(projectAOfOrgA.id)

      // user2 is owner of a separate orgB with a project there
      const tsB = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const orgB = await user2Api.organizations.create({ name: `Cross Org B ${tsB}` })
      createdOrgIds.push(orgB.id)
      const projectInOrgB = await user2Api.goals.createGoal({
        name: `Project in B ${tsB}`,
        organizationId: orgB.id,
      })
      if (!projectInOrgB) throw new Error('Failed to create cross-org project')

      // user2 tries drill-down for orgB's project but scoped under orgA.
      // Middleware passes because user2 owns the project (has all permissions on it).
      // The data layer filters by orgA, so the drill-down must return no tasks
      // belonging to projectInOrgB. The response itself is 200, but tasks are scoped.
      const result = await user2Api.analytics.fetchDrillDown({
        sectionId: 'kpi.overdue',
        scope: { kind: 'project', goalId: projectInOrgB.id },
        organizationId: orgAId,
        period: '30d',
        bucket: '',
        datasetId: 'kpi',
        index: 0,
      })
      // No task from orgB must appear in the response when querying under orgA
      const leakedGoalIds = result.tasks.map(t => t.goalId)
      expect(leakedGoalIds).not.toContain(projectInOrgB.id)
    })
  })

  describe('Cross-org isolation (no data leakage)', () => {
    it('cross-org goalId returns no foreign-org data; sanity that own org data is visible', async () => {
      const { orgId: orgAId, projectA: projectAOfOrgA } = await setupSharedOrg('cross-A')
      await grantAnalyticsViewToUser2(projectAOfOrgA.id)

      const tsB = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const orgB = await user2Api.organizations.create({ name: `Org B ${tsB}` })
      createdOrgIds.push(orgB.id)
      const projectInOrgB = await user2Api.goals.createGoal({
        name: `Project in B ${tsB}`,
        organizationId: orgB.id,
      })
      if (!projectInOrgB) throw new Error('Failed to create project in orgB')

      // user2 is member of orgA AND owner of orgB+projectInOrgB.
      // They request analytics with organizationId=orgA but goalId from orgB.
      // Backend may return 200 (middleware passes because user has permissions
      // on the goal directly via ownership), but the data layer filters by
      // organizationId, so cross-org data must NOT appear in the response.
      const result = await user2Api.analytics.fetchSections({
        scope: { kind: 'project', goalId: projectInOrgB.id },
        organizationId: orgAId,
        period: '30d',
      })

      const goalIds = result.availableGoals.map(g => g.id)
      // Sanity: orgA data is reachable (user2 has analytics_can_view on projectAOfOrgA)
      expect(goalIds).toContain(projectAOfOrgA.id)
      // Critical: orgB data must NOT leak through orgA-scoped request
      expect(goalIds).not.toContain(projectInOrgB.id)
    })
  })
})
