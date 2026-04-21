import { describe, it, expect, afterAll } from 'vitest'
import { registerOrganizationsTools } from '../../tools/organizations.js'
import { registerGoalsTools } from '../../tools/goals.js'
import { api, captureServer, call, parse, ts } from './setup.js'

const { server, tools } = captureServer()
registerOrganizationsTools(server, api)
registerGoalsTools(server, api)

const createdOrgIds: number[] = []
const createdGoalIds: number[] = []

afterAll(async () => {
  for (const id of createdGoalIds) {
    await call(tools, 'delete_goal', { goalId: id }).catch(() => {})
  }
  for (const id of createdOrgIds) {
    await call(tools, 'delete_organization', { organizationId: id }).catch(() => {})
  }
})

describe('organizations integration', () => {
  it('creates an organization', async () => {
    const name = `Test Org ${ts()}`
    const result = await call(tools, 'create_organization', { name })
    const org = parse(result)

    expect(org.id).toBeTypeOf('number')
    expect(org.name).toBe(name)
    expect(org.slug).toBeTruthy()
    createdOrgIds.push(org.id)
  })

  it('lists organizations including the created one', async () => {
    const result = await call(tools, 'list_organizations')
    const orgs = parse(result)

    expect(Array.isArray(orgs)).toBe(true)
    expect(orgs.some((o: { id: number }) => o.id === createdOrgIds[0])).toBe(true)
  })

  it('gets organization by id', async () => {
    const result = await call(tools, 'get_organization', { organizationId: createdOrgIds[0] })
    const org = parse(result)

    expect(org.id).toBe(createdOrgIds[0])
    expect(org.name).toBeTruthy()
  })

  it('updates an organization', async () => {
    const newName = `Updated Org ${ts()}`
    const result = await call(tools, 'update_organization', {
      organizationId: createdOrgIds[0],
      name: newName,
      slug: `updated-org-${ts()}`,
    })
    const org = parse(result)

    expect(org.name).toBe(newName)
  })

  it('adds a member to organization', async () => {
    const email = `member-${ts()}@test.com`
    const result = await call(tools, 'add_organization_member', {
      organizationId: createdOrgIds[0],
      email,
      role: 'member',
    })
    const member = parse(result)

    expect(member.email).toBe(email)
    expect(member.role).toBe('member')
  })

  it('lists organization members', async () => {
    const result = await call(tools, 'list_organization_members', {
      organizationId: createdOrgIds[0],
    })
    const members = parse(result)

    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThanOrEqual(2)

    const owner = members.find((m: { role: string }) => m.role === 'owner')
    expect(owner).toBeTruthy()
  })

  it('updates member role', async () => {
    const email = `role-change-${ts()}@test.com`
    await call(tools, 'add_organization_member', {
      organizationId: createdOrgIds[0],
      email,
      role: 'member',
    })

    const result = await call(tools, 'update_organization_member_role', {
      organizationId: createdOrgIds[0],
      email,
      role: 'admin',
    })
    const member = parse(result)

    expect(member.role).toBe('admin')
  })

  it('removes a member from organization', async () => {
    const email = `removable-${ts()}@test.com`
    await call(tools, 'add_organization_member', {
      organizationId: createdOrgIds[0],
      email,
      role: 'member',
    })

    const result = await call(tools, 'remove_organization_member', {
      organizationId: createdOrgIds[0],
      email,
    })
    const data = parse(result)

    expect(data.removed).toBe(true)

    const membersResult = await call(tools, 'list_organization_members', {
      organizationId: createdOrgIds[0],
    })
    const members = parse(membersResult)
    expect(members.find((m: { email: string }) => m.email === email)).toBeUndefined()
  })

  it('creates a goal within organization', async () => {
    const name = `Org Project ${ts()}`
    const result = await call(tools, 'create_goal', {
      name,
      organizationId: createdOrgIds[0],
    })
    const goal = parse(result)

    expect(goal.id).toBeTypeOf('number')
    expect(goal.name).toBe(name)
    expect(goal.organizationId).toBe(createdOrgIds[0])
    createdGoalIds.push(goal.id)
  })

  it('lists goals filtered by organization', async () => {
    const result = await call(tools, 'list_goals', {
      organizationId: createdOrgIds[0],
    })
    const goals = parse(result)

    expect(Array.isArray(goals)).toBe(true)
    expect(goals.some((g: { id: number }) => g.id === createdGoalIds[0])).toBe(true)
  })

  it('deletes an organization', async () => {
    const createResult = await call(tools, 'create_organization', {
      name: `ToDelete ${ts()}`,
    })
    const org = parse(createResult)

    const result = await call(tools, 'delete_organization', {
      organizationId: org.id,
    })
    const data = parse(result)

    expect(data.deleted).toBe(true)
  })
})
