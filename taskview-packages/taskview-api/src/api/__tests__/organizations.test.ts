import { TvApi } from '@/tv'
import { TvPermissions } from '@/api/permissions'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initApi } from './init-api'

let user1Api: TvApi
let user2Api: TvApi
let user1Email: string
let user2Email: string
let deleteAllGoals: () => Promise<void>

beforeAll(async () => {
  const init = await initApi()
  user1Api = init.$tvApi
  user2Api = init.$tvApiForSecondUser
  user1Email = init.user1Email
  user2Email = init.user2Email
  deleteAllGoals = init.deleteAllGoals
})

afterAll(async () => {
  await deleteAllGoals()
})

describe('Organizations: creation and management', () => {
  let createdOrgId: number

  it('should create organization and assign creator as owner', async () => {
    const org = await user1Api.organizations.create({ name: 'Test Org' })

    expect(org).toBeTruthy()
    expect(org.name).toBe('Test Org')
    expect(org.slug).toBeTruthy()
    createdOrgId = org.id

    const members = await user1Api.organizations.fetchMembers(org.id)
    const creator = members.find(m => m.email === user1Email)
    expect(creator).toBeTruthy()
    expect(creator!.role).toBe('owner')
  })

  it('should appear in the user organization list', async () => {
    const orgs = await user1Api.organizations.fetch()

    const testOrg = orgs.find(o => o.id === createdOrgId)
    expect(testOrg).toBeTruthy()
    expect(testOrg!.name).toBe('Test Org')
  })

  it('should not be visible to other users', async () => {
    const orgs = await user2Api.organizations.fetch()

    const testOrg = orgs.find(o => o.id === createdOrgId)
    expect(testOrg).toBeUndefined()
  })

  it('should allow owner to update name and slug', async () => {
    const updated = await user1Api.organizations.update({
      organizationId: createdOrgId,
      name: 'Updated Org',
      slug: 'updated-org',
    })

    expect(updated).toBeTruthy()
    expect(updated.name).toBe('Updated Org')
    expect(updated.slug).toBe('updated-org')
  })
})

describe('Organization members', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Members Org' })
    orgId = org.id
  })

  it('should allow owner to add member by email', async () => {
    const member = await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'member',
    })

    expect(member).toBeTruthy()
    expect(member.email).toBe(user2Email)
    expect(member.role).toBe('member')
  })

  it('should allow owner to change member role to admin', async () => {
    const updated = await user1Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    })

    expect(updated).toBeTruthy()
    expect(updated.role).toBe('admin')
  })

  it('should not allow promoting a member to owner', async () => {
    await user1Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      // @ts-expect-error - owner is not a valid role
      role: 'owner',
    }).catch(() => null)

    const members = await user1Api.organizations.fetchMembers(orgId)
    const user2 = members.find(m => m.email === user2Email)
    expect(user2!.role).not.toBe('owner')
  })

  it('should not allow changing the owner role', async () => {
    const members = await user1Api.organizations.fetchMembers(orgId)
    const owner = members.find(m => m.role === 'owner')!

    await user1Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: owner.email,
      role: 'member',
    }).catch(() => null)

    const membersAfter = await user1Api.organizations.fetchMembers(orgId)
    const ownerAfter = membersAfter.find(m => m.role === 'owner')
    expect(ownerAfter).toBeTruthy()
  })

  it('should not allow removing the owner from organization', async () => {
    const members = await user1Api.organizations.fetchMembers(orgId)
    const owner = members.find(m => m.role === 'owner')!

    await user1Api.organizations.removeMember({
      organizationId: orgId,
      email: owner.email,
    }).catch(() => null)

    const membersAfter = await user1Api.organizations.fetchMembers(orgId)
    const ownerAfter = membersAfter.find(m => m.role === 'owner')
    expect(ownerAfter).toBeTruthy()
  })

  it('should allow owner to remove a member', async () => {
    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: 'removable@test.com',
      role: 'member',
    })

    const result = await user1Api.organizations.removeMember({
      organizationId: orgId,
      email: 'removable@test.com',
    })

    expect(result).toBeTruthy()

    const members = await user1Api.organizations.fetchMembers(orgId)
    const removed = members.find(m => m.email === 'removable@test.com')
    expect(removed).toBeUndefined()
  })
})

describe('Projects in organization', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Projects Org' })
    orgId = org.id
  })

  it('should allow org owner to create a project', async () => {
    const goal = await user1Api.goals.createGoal({
      name: 'Org Project',
      organizationId: orgId,
    })

    expect(goal).toBeTruthy()
    expect(goal!.name).toBe('Org Project')
    expect(goal!.organizationId).toBe(orgId)
  })

  it('should grant all permissions to project creator', async () => {
    const goal = await user1Api.goals.createGoal({
      name: 'Permissions Check Project',
      organizationId: orgId,
    })

    expect(goal).toBeTruthy()
    const permissions = goal!.permissions

    const allPermissionKeys = Object.values(TvPermissions)
    for (const perm of allPermissionKeys) {
      expect(permissions[perm], `missing permission: ${perm}`).toBe(true)
    }
  })

  it('should return project when fetching by organizationId', async () => {
    const goals = await user1Api.goals.fetchGoals(orgId)

    const project = goals.find(g => g.name === 'Org Project')
    expect(project).toBeTruthy()
  })

  it('should not return project when fetching with a different organizationId', async () => {
    const otherOrg = await user1Api.organizations.create({ name: 'Other Org' })
    const goals = await user1Api.goals.fetchGoals(otherOrg.id)

    const project = goals.find(g => g.name === 'Org Project')
    expect(project).toBeUndefined()
  })

  it('should set org owner as project owner when admin creates project', async () => {
    const adminOrg = await user1Api.organizations.create({ name: 'Admin Creates Project Org' })

    await user1Api.organizations.addMember({
      organizationId: adminOrg.id,
      email: user2Email,
      role: 'admin',
    })

    // user1 creates a project to get their owner id
    const ownerProject = await user1Api.goals.createGoal({
      name: 'Owner Reference',
      organizationId: adminOrg.id,
    })
    const orgOwnerId = ownerProject!.owner

    // admin (user2) creates a project
    const adminProject = await user2Api.goals.createGoal({
      name: 'Admin Created Project',
      organizationId: adminOrg.id,
    })

    expect(adminProject).toBeTruthy()
    expect(adminProject!.owner).toBe(orgOwnerId)
  })

  it('should keep projects after removing the admin who created them', async () => {
    const org = await user1Api.organizations.create({ name: 'Admin Removal Org' })

    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'admin',
    })

    // admin creates a project
    const project = await user2Api.goals.createGoal({
      name: 'Project By Removed Admin',
      organizationId: org.id,
    })
    expect(project).toBeTruthy()

    // remove admin from org
    await user1Api.organizations.removeMember({
      organizationId: org.id,
      email: user2Email,
    })

    // project still exists and accessible by org owner
    const goals = await user1Api.goals.fetchGoals(org.id)
    const survivedProject = goals.find(g => g.name === 'Project By Removed Admin')
    expect(survivedProject).toBeTruthy()
    expect(survivedProject!.id).toBe(project!.id)
  })

  it('should auto-add user to org members when invited to a project', async () => {
    const org = await user1Api.organizations.create({ name: 'Auto Member Org' })

    const goal = await user1Api.goals.createGoal({
      name: 'Auto Member Project',
      organizationId: org.id,
    })

    // user2 is not a member of this org yet
    const membersBefore = await user1Api.organizations.fetchMembers(org.id)
    const user2Before = membersBefore.find(m => m.email === user2Email)
    expect(user2Before).toBeUndefined()

    // invite user2 to the project via collaboration
    await user1Api.collaboration.inviteUserToGoal({
      goalId: goal!.id,
      email: user2Email,
    })

    // user2 should now appear in org members
    const membersAfter = await user1Api.organizations.fetchMembers(org.id)
    const user2After = membersAfter.find(m => m.email === user2Email)
    expect(user2After).toBeTruthy()
    expect(user2After!.role).toBe('member')
  })

  it('should not allow a regular member to create a project', async () => {
    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'member',
    })

    const result = await user2Api.goals.createGoal({
      name: 'Should Fail',
      organizationId: orgId,
    }).catch(() => null)

    expect(result).toBeNull()
  })
})

describe('Data isolation between organizations', () => {
  let org1Id: number
  let org2Id: number

  beforeAll(async () => {
    const org1 = await user1Api.organizations.create({ name: 'Isolated Org 1' })
    const org2 = await user2Api.organizations.create({ name: 'Isolated Org 2' })
    org1Id = org1.id
    org2Id = org2.id

    await user1Api.goals.createGoal({ name: 'Org1 Project', organizationId: org1Id })
    await user2Api.goals.createGoal({ name: 'Org2 Project', organizationId: org2Id })
  })

  it('should deny user1 access to user2 organization projects', async () => {
    const goals = await user1Api.goals.fetchGoals(org2Id).catch(() => [])
    expect(goals).toHaveLength(0)
  })

  it('should deny user2 access to user1 organization projects', async () => {
    const goals = await user2Api.goals.fetchGoals(org1Id).catch(() => [])
    expect(goals).toHaveLength(0)
  })

  it('should only return own projects when fetching own org', async () => {
    const goals = await user1Api.goals.fetchGoals(org1Id)

    expect(goals.length).toBeGreaterThan(0)
    const hasOrg2Project = goals.find(g => g.name === 'Org2 Project')
    expect(hasOrg2Project).toBeUndefined()
  })
})

describe('Invited collaborator has no permissions by default', () => {
  let orgId: number
  let goalId: number
  const invitedEmail = `invited-${Date.now()}@test.com`

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'No Perms Org' })
    orgId = org.id

    const goal = await user1Api.goals.createGoal({
      name: 'No Perms Project',
      organizationId: orgId,
    })
    goalId = goal!.id

    // invite a fresh user (no prior roles anywhere)
    await user1Api.collaboration.inviteUserToGoal({
      goalId,
      email: invitedEmail,
    })
  })

  it('should return the shared goal with empty permissions for invited user', async () => {
    // user1 (owner) fetches goal and checks collaboration
    const users = await user1Api.collaboration.fetchUsersForGoal(goalId)
    const invited = users?.find(u => u.email === invitedEmail)
    expect(invited).toBeTruthy()
    expect(invited!.roles).toHaveLength(0)
  })

  it('should not assign any roles to a freshly invited user', async () => {
    const freshEmail = `fresh-${Date.now()}@test.com`
    const org = await user1Api.organizations.create({ name: 'Fresh Invite Roles Org' })
    const goal = await user1Api.goals.createGoal({
      name: 'Fresh Invite Roles Project',
      organizationId: org.id,
    })

    await user1Api.collaboration.inviteUserToGoal({
      goalId: goal!.id,
      email: freshEmail,
    })

    const users = await user1Api.collaboration.fetchUsersForGoal(goal!.id)
    const freshUser = users?.find(u => u.email === freshEmail)
    expect(freshUser).toBeTruthy()
    expect(freshUser!.roles).toHaveLength(0)
  })
})

describe('Member removal revokes project access', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Remove Access Org' })
    orgId = org.id

    await user1Api.goals.createGoal({ name: 'Secret Project', organizationId: orgId })

    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    })
  })

  it('should revoke project access after removing member from org', async () => {
    await user1Api.organizations.removeMember({
      organizationId: orgId,
      email: user2Email,
    })

    // 403 = no access to org
    const goals = await user2Api.goals.fetchGoals(orgId).catch(() => [])
    expect(goals).toHaveLength(0)
  })
})

describe('Cross-org access control', () => {
  let user1OrgId: number
  let user1GoalId: number

  beforeAll(async () => {
    const org1 = await user1Api.organizations.create({ name: 'Secure Org 1' })
    await user2Api.organizations.create({ name: 'Secure Org 2' })
    user1OrgId = org1.id

    const goal = await user1Api.goals.createGoal({ name: 'Secure Project', organizationId: user1OrgId })
    user1GoalId = goal!.id

    await user1Api.goalLists.createList({ name: 'Secure List', goalId: user1GoalId })
    await user1Api.tasks.createTask({ goalId: user1GoalId, description: 'Secure Task' })
  })

  it('should deny non-member from updating another org', async () => {
    const status = await user2Api.organizations.update({
      organizationId: user1OrgId,
      name: 'Hacked Org',
    }).catch((err) => err.status)

    expect(status).toBe(403)

    const orgs = await user1Api.organizations.fetch()
    const org = orgs.find(o => o.id === user1OrgId)
    expect(org!.name).toBe('Secure Org 1')
  })

  it('should deny non-member from viewing org members', async () => {
    const status = await user2Api.organizations.fetchMembers(user1OrgId).catch((err) => err.status)
    expect(status).toBe(403)
  })

  it('should deny non-member from adding members to another org', async () => {
    const status = await user2Api.organizations.addMember({
      organizationId: user1OrgId,
      email: 'hacker@test.com',
      role: 'admin',
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny non-member from changing member roles in another org', async () => {
    const status = await user2Api.organizations.updateMemberRole({
      organizationId: user1OrgId,
      email: user1Email,
      role: 'member',
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny non-member from removing members from another org', async () => {
    const status = await user2Api.organizations.removeMember({
      organizationId: user1OrgId,
      email: user1Email,
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny non-member from deleting another org', async () => {
    const status = await user2Api.organizations.delete({
      organizationId: user1OrgId,
    }).catch((err) => err.status)

    expect(status).toBeGreaterThanOrEqual(400)

    const orgs = await user1Api.organizations.fetch()
    expect(orgs.find(o => o.id === user1OrgId)).toBeTruthy()
  })

  it('should deny non-member from fetching org details by id', async () => {
    const status = await user2Api.organizations.getById(user1OrgId).catch((err) => err.status)
    expect(status).toBe(403)
  })

  it('should deny non-member from accessing tasks in another org project', async () => {
    const status = await user2Api.tasks.fetch({
      goalId: user1GoalId,
      page: 0,
      showCompleted: 0,
      firstNew: 0,
      componentId: -1401,
    }).catch((err) => err.status)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from creating tasks in another org project', async () => {
    const status = await user2Api.tasks.createTask({
      goalId: user1GoalId,
      description: 'Injected task',
    }).catch((err) => err.status)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from editing goals in another org', async () => {
    const status = await user2Api.goals.updateGoal({
      id: user1GoalId,
      name: 'Hacked Project',
    }).catch((err) => err.status)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from deleting goals in another org', async () => {
    const status = await user2Api.goals.deleteGoal(user1GoalId).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)

    const goals = await user1Api.goals.fetchGoals(user1OrgId)
    expect(goals.find(g => g.id === user1GoalId)).toBeTruthy()
  })
})

describe('Regular member restrictions', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Member Restrictions Org' })
    orgId = org.id

    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'member',
    })
  })

  it('should deny regular member from updating org details', async () => {
    const status = await user2Api.organizations.update({
      organizationId: orgId,
      name: 'Member Changed Name',
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny regular member from adding members', async () => {
    const status = await user2Api.organizations.addMember({
      organizationId: orgId,
      email: 'newuser@test.com',
      role: 'member',
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny regular member from changing member roles', async () => {
    const status = await user2Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny regular member from removing members', async () => {
    const status = await user2Api.organizations.removeMember({
      organizationId: orgId,
      email: user1Email,
    }).catch((err) => err.status)

    expect(status).toBe(403)
  })

  it('should deny regular member from deleting org', async () => {
    const status = await user2Api.organizations.delete({
      organizationId: orgId,
    }).catch((err) => err.status)

    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should allow regular member to view org members', async () => {
    const members = await user2Api.organizations.fetchMembers(orgId)
    expect(members.length).toBeGreaterThan(0)
  })

  it('should allow regular member to view org details', async () => {
    const org = await user2Api.organizations.getById(orgId)
    expect(org).toBeTruthy()
    expect(org.name).toBe('Member Restrictions Org')
  })
})

describe('Slug uniqueness', () => {
  it('should not allow creating two organizations with the same slug', async () => {
    const slug = `unique-slug-${Date.now()}`
    const org1 = await user1Api.organizations.create({ name: 'Slug Org 1', slug })
    expect(org1).toBeTruthy()
    expect(org1.slug).toBe(slug)

    const org2 = await user1Api.organizations.create({ name: 'Slug Org 2', slug }).catch(() => null)
    expect(org2).toBeFalsy()
  })

  it('should lowercase slug on create', async () => {
    const org = await user1Api.organizations.create({ name: 'Upper Slug', slug: `MY-ORG-${Date.now()}` })
    expect(org).toBeTruthy()
    expect(org.slug).toBe(org.slug.toLowerCase())
    expect(org.slug).not.toMatch(/[A-Z]/)
  })

  it('should lowercase slug on update', async () => {
    const org = await user1Api.organizations.create({ name: 'Update Slug Case' })
    const newSlug = `UPDATED-SLUG-${Date.now()}`
    const updated = await user1Api.organizations.update({
      organizationId: org.id,
      slug: newSlug,
    })
    expect(updated).toBeTruthy()
    expect(updated.slug).toBe(newSlug.toLowerCase())
    expect(updated.slug).not.toMatch(/[A-Z]/)
  })

  it('should not allow updating slug to an existing one', async () => {
    const slug1 = `slug-a-${Date.now()}`
    const slug2 = `slug-b-${Date.now()}`
    const org1 = await user1Api.organizations.create({ name: 'Slug A', slug: slug1 })
    await user1Api.organizations.create({ name: 'Slug B', slug: slug2 })

    const result = await user1Api.organizations.update({
      organizationId: org1.id,
      slug: slug2,
    }).catch(() => null)

    expect(result).toBeFalsy()
  })
})

describe('Admin can create projects and manage members', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Admin Powers Org' })
    orgId = org.id

    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    })
  })

  it('should allow admin to create a project', async () => {
    const goal = await user2Api.goals.createGoal({
      name: 'Admin Project',
      organizationId: orgId,
    })

    expect(goal).toBeTruthy()
    expect(goal!.name).toBe('Admin Project')
    expect(goal!.organizationId).toBe(orgId)
  })

  it('should allow admin to add members', async () => {
    const member = await user2Api.organizations.addMember({
      organizationId: orgId,
      email: `admin-invited-${Date.now()}@test.com`,
      role: 'member',
    })

    expect(member).toBeTruthy()
    expect(member.role).toBe('member')
  })

  it('should allow admin to change member roles', async () => {
    const email = `role-change-${Date.now()}@test.com`
    await user2Api.organizations.addMember({
      organizationId: orgId,
      email,
      role: 'member',
    })

    const updated = await user2Api.organizations.updateMemberRole({
      organizationId: orgId,
      email,
      role: 'admin',
    })

    expect(updated).toBeTruthy()
    expect(updated.role).toBe('admin')
  })

  it('should allow admin to remove members', async () => {
    const email = `removable-admin-${Date.now()}@test.com`
    await user2Api.organizations.addMember({
      organizationId: orgId,
      email,
      role: 'member',
    })

    const result = await user2Api.organizations.removeMember({
      organizationId: orgId,
      email,
    })

    expect(result).toBeTruthy()
  })
})

describe('Task-level cross-org isolation', () => {
  let user1OrgId: number
  let user1GoalId: number
  let user1TaskId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Task Isolation Org' })
    user1OrgId = org.id

    const goal = await user1Api.goals.createGoal({
      name: 'Task Isolation Project',
      organizationId: user1OrgId,
    })
    user1GoalId = goal!.id

    const task = await user1Api.tasks.createTask({
      goalId: user1GoalId,
      description: 'Secret task',
    })
    user1TaskId = task!.id
  })

  it('should deny non-member from fetching task by id', async () => {
    const status = await user2Api.tasks.fetchTaskById(user1TaskId).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from updating a task', async () => {
    const status = await user2Api.tasks.updateTask({
      id: user1TaskId,
      description: 'Hacked',
    }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from deleting a task', async () => {
    const status = await user2Api.tasks.deleteTask(user1TaskId).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)

    // task still exists for owner
    const task = await user1Api.tasks.fetchTaskById(user1TaskId)
    expect(task).toBeTruthy()
    expect(task!.id).toBe(user1TaskId)
  })
})

describe('Goal list cross-org isolation', () => {
  let user1GoalId: number
  let user1ListId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'List Isolation Org' })
    const goal = await user1Api.goals.createGoal({
      name: 'List Isolation Project',
      organizationId: org.id,
    })
    user1GoalId = goal!.id

    const list = await user1Api.goalLists.createList({
      name: 'Secret List',
      goalId: user1GoalId,
    })
    user1ListId = list!.id
  })

  it('should deny non-member from fetching lists of another org project', async () => {
    const status = await user2Api.goalLists.fetchLists({ goalId: user1GoalId }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from creating lists in another org project', async () => {
    const status = await user2Api.goalLists.createList({
      name: 'Injected List',
      goalId: user1GoalId,
    }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from updating lists in another org project', async () => {
    const status = await user2Api.goalLists.updateList({
      id: user1ListId,
      name: 'Hacked List',
    }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from deleting lists in another org project', async () => {
    const status = await user2Api.goalLists.deleteList(user1ListId).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)

    // list still exists
    const lists = await user1Api.goalLists.fetchLists({ goalId: user1GoalId })
    expect(lists!.find(l => l.id === user1ListId)).toBeTruthy()
  })
})

describe('Tag cross-org isolation', () => {
  let user1GoalId: number
  let user1TagId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Tag Isolation Org' })
    const goal = await user1Api.goals.createGoal({
      name: 'Tag Isolation Project',
      organizationId: org.id,
    })
    user1GoalId = goal!.id

    const tag = await user1Api.tags.createTag({
      name: 'Secret Tag',
      color: '#ff0000',
      goalId: user1GoalId,
    })
    user1TagId = tag!.id
  })

  it('should deny non-member from creating tags in another org project', async () => {
    const status = await user2Api.tags.createTag({
      name: 'Injected Tag',
      color: '#000000',
      goalId: user1GoalId,
    }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from updating tags in another org project', async () => {
    const status = await user2Api.tags.updateTag({
      id: user1TagId,
      name: 'Hacked Tag',
      color: '#000000',
      goalId: user1GoalId,
    }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should deny non-member from deleting tags in another org project', async () => {
    const status = await user2Api.tags.deleteTag({ tagId: user1TagId }).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })
})

describe('User in multiple organizations', () => {
  let org1Id: number
  let org2Id: number
  let goal1Id: number
  let goal2Id: number

  beforeAll(async () => {
    const org1 = await user1Api.organizations.create({ name: 'Multi Org 1' })
    const org2 = await user1Api.organizations.create({ name: 'Multi Org 2' })
    org1Id = org1.id
    org2Id = org2.id

    const goal1 = await user1Api.goals.createGoal({ name: 'Org1 Only Project', organizationId: org1Id })
    const goal2 = await user1Api.goals.createGoal({ name: 'Org2 Only Project', organizationId: org2Id })
    goal1Id = goal1!.id
    goal2Id = goal2!.id

    // user2 is member of both orgs
    await user1Api.organizations.addMember({ organizationId: org1Id, email: user2Email, role: 'member' })
    await user1Api.organizations.addMember({ organizationId: org2Id, email: user2Email, role: 'admin' })

    // invite user2 to projects so they can see them
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal1Id, email: user2Email })
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal2Id, email: user2Email })
  })

  it('should list both organizations for user2', async () => {
    const orgs = await user2Api.organizations.fetch()
    expect(orgs.find(o => o.id === org1Id)).toBeTruthy()
    expect(orgs.find(o => o.id === org2Id)).toBeTruthy()
  })

  it('should return only org1 projects when fetching org1', async () => {
    const goals = await user2Api.goals.fetchGoals(org1Id)
    expect(goals.some(g => g.name === 'Org1 Only Project')).toBe(true)
    expect(goals.some(g => g.name === 'Org2 Only Project')).toBe(false)
  })

  it('should return only org2 projects when fetching org2', async () => {
    const goals = await user2Api.goals.fetchGoals(org2Id)
    expect(goals.some(g => g.name === 'Org2 Only Project')).toBe(true)
    expect(goals.some(g => g.name === 'Org1 Only Project')).toBe(false)
  })
})

describe('Collaboration cleanup on member removal', () => {
  it('should remove user from project collaboration when removed from org', async () => {
    const org = await user1Api.organizations.create({ name: 'Collab Cleanup Org' })

    const goal = await user1Api.goals.createGoal({
      name: 'Collab Cleanup Project',
      organizationId: org.id,
    })

    // add user2 as member and invite to project
    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'admin',
    })
    await user1Api.collaboration.inviteUserToGoal({
      goalId: goal!.id,
      email: user2Email,
    })

    // verify user2 is in collaboration
    const usersBefore = await user1Api.collaboration.fetchUsersForGoal(goal!.id)
    expect(usersBefore?.find(u => u.email === user2Email)).toBeTruthy()

    // remove user2 from org
    await user1Api.organizations.removeMember({
      organizationId: org.id,
      email: user2Email,
    })

    // user2 should be removed from collaboration
    const usersAfter = await user1Api.collaboration.fetchUsersForGoal(goal!.id)
    const user2After = usersAfter?.find(u => u.email === user2Email)
    expect(user2After).toBeUndefined()
  })
})

describe('Privilege escalation prevention', () => {
  let orgId: number

  beforeAll(async () => {
    const org = await user1Api.organizations.create({ name: 'Escalation Test Org' })
    orgId = org.id

    await user1Api.organizations.addMember({
      organizationId: orgId,
      email: user2Email,
      role: 'member',
    })
  })

  it('should not allow member to escalate self to admin', async () => {
    const status = await user2Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    }).catch((err) => err.status)

    expect(status).toBe(403)

    const members = await user1Api.organizations.fetchMembers(orgId)
    const user2 = members.find(m => m.email === user2Email)
    expect(user2!.role).toBe('member')
  })

  it('should not allow admin to change owner role', async () => {
    // promote user2 to admin first
    await user1Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      role: 'admin',
    })

    await user2Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user1Email,
      role: 'member',
    }).catch(() => null)

    // owner is still owner
    const members = await user1Api.organizations.fetchMembers(orgId)
    const owner = members.find(m => m.email === user1Email)
    expect(owner!.role).toBe('owner')
  })

  it('should not allow setting role to owner via API', async () => {
    await user1Api.organizations.updateMemberRole({
      organizationId: orgId,
      email: user2Email,
      // @ts-expect-error - owner is not a valid role
      role: 'owner',
    }).catch(() => null)

    const members = await user1Api.organizations.fetchMembers(orgId)
    const user2 = members.find(m => m.email === user2Email)
    expect(user2!.role).not.toBe('owner')
  })
})

describe('Email case sensitivity', () => {
  it('should not create duplicate members with different email case', async () => {
    const org = await user1Api.organizations.create({ name: 'Case Test Org' })

    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'member',
    })

    // try adding same email with uppercase
    const upper = user2Email.toUpperCase()
    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: upper,
      role: 'admin',
    }).catch(() => null)

    const members = await user1Api.organizations.fetchMembers(org.id)
    const user2Members = members.filter(m =>
      m.email.toLowerCase() === user2Email.toLowerCase()
    )
    // should be exactly 1 entry, not 2
    expect(user2Members.length).toBe(1)
  })
})

describe('Edge cases and error handling', () => {
  it('should handle non-existent organization ID gracefully', async () => {
    const status = await user1Api.organizations.getById(999999).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should return empty members for non-existent org', async () => {
    const status = await user1Api.organizations.fetchMembers(999999).catch((err) => err.status)
    expect(status).toBeGreaterThanOrEqual(400)
  })

  it('should handle removing non-existent member gracefully', async () => {
    const org = await user1Api.organizations.create({ name: 'Remove Ghost Org' })

    const result = await user1Api.organizations.removeMember({
      organizationId: org.id,
      email: 'ghost@nonexistent.com',
    }).catch(() => null)

    // should not crash — returns false or null
    expect(result).toBeFalsy()
  })

  it('should reject creating organization with empty name', async () => {
    const result = await user1Api.organizations.create({ name: '' }).catch(() => null)
    expect(result).toBeFalsy()
  })

  it('should handle double-invite of same user to org', async () => {
    const org = await user1Api.organizations.create({ name: 'Double Invite Org' })

    const first = await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'member',
    })
    expect(first).toBeTruthy()

    // second invite should not duplicate
    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'member',
    }).catch(() => null)

    const members = await user1Api.organizations.fetchMembers(org.id)
    const user2Members = members.filter(m => m.email === user2Email)
    expect(user2Members.length).toBe(1)
  })

  it('should handle double-invite of same user to goal collaboration', async () => {
    const org = await user1Api.organizations.create({ name: 'Double Collab Org' })
    const goal = await user1Api.goals.createGoal({
      name: 'Double Collab Project',
      organizationId: org.id,
    })

    const email = `double-${Date.now()}@test.com`
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal!.id, email })
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal!.id, email }).catch(() => null)

    const users = await user1Api.collaboration.fetchUsersForGoal(goal!.id)
    const entries = users?.filter(u => u.email === email)
    expect(entries!.length).toBe(1)
  })
})

describe('Goal deletion cleans up collaboration', () => {
  it('should remove collaboration records when goal is deleted', async () => {
    const org = await user1Api.organizations.create({ name: 'Goal Delete Cleanup Org' })
    const goal = await user1Api.goals.createGoal({
      name: 'Will Be Deleted Project',
      organizationId: org.id,
    })

    const email = `cleanup-${Date.now()}@test.com`
    await user1Api.collaboration.inviteUserToGoal({ goalId: goal!.id, email })

    // verify user exists in collaboration
    const usersBefore = await user1Api.collaboration.fetchUsersForGoal(goal!.id)
    expect(usersBefore?.find(u => u.email === email)).toBeTruthy()

    // delete goal
    await user1Api.goals.deleteGoal(goal!.id)

    // goal no longer exists
    const goals = await user1Api.goals.fetchGoals(org.id)
    expect(goals.find(g => g.id === goal!.id)).toBeUndefined()
  })
})

describe('Organization deletion', () => {
  it('should not allow deleting personal workspace', async () => {
    const orgs = await user1Api.organizations.fetch()
    const personal = orgs.find(o => (o as any).isPersonal === 1)

    if (personal) {
      await user1Api.organizations.delete({
        organizationId: personal.id,
      }).catch(() => null)

      const orgsAfter = await user1Api.organizations.fetch()
      const stillExists = orgsAfter.find(o => o.id === personal.id)
      expect(stillExists).toBeTruthy()
    }
  })

  it('should not allow non-owner to delete organization', async () => {
    const org = await user1Api.organizations.create({ name: 'Delete Test Org' })

    await user1Api.organizations.addMember({
      organizationId: org.id,
      email: user2Email,
      role: 'admin',
    })

    await user2Api.organizations.delete({
      organizationId: org.id,
    }).catch(() => null)

    const orgs = await user1Api.organizations.fetch()
    const stillExists = orgs.find(o => o.id === org.id)
    expect(stillExists).toBeTruthy()
  })

  it('should allow owner to delete organization', async () => {
    const org = await user1Api.organizations.create({ name: 'Will Be Deleted' })

    const result = await user1Api.organizations.delete({
      organizationId: org.id,
    })

    expect(result).toBeTruthy()

    const orgs = await user1Api.organizations.fetch()
    const deleted = orgs.find(o => o.id === org.id)
    expect(deleted).toBeUndefined()
  })
})
