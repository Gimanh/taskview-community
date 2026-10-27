import type { ScimSuspendedMembership, ScimUsersSchemaTypeForSelect } from 'taskview-db-schemas'
import { $logger } from '../../modules/logget'
import { isEmail } from '../../utils/helpers'
import AuthModel from '../auth/AuthModel'
import SessionStorage from '../auth/SessionStorage'
import { OrganizationRepository } from '../organizations/OrganizationRepository'
import { SsoRepository } from '../sso/SsoRepository'
import { ScimError } from './ScimError'
import { ScimGroupProjectsManager } from './ScimGroupProjectsManager'
import { ScimRepository } from './ScimRepository'
import { applyPatchOperations, attributesOf } from './scim.helpers'
import type {
  ScimApplyChangesArgs,
  ScimChangeEmailArgs,
  ScimCreateUserArgs,
  ScimEmailArgs,
  ScimLinkMemberArgs,
  ScimListUsersArgs,
  ScimListUsersResult,
  ScimPatchUserArgs,
  ScimReactivateArgs,
  ScimReplaceUserArgs,
  ScimUserByIdArgs,
} from './types'

export class ScimManager {
  private readonly repository = new ScimRepository()
  private readonly orgRepo = new OrganizationRepository()
  private readonly ssoRepo = new SsoRepository()
  private readonly authModel = new AuthModel()
  private readonly sessionStorage = new SessionStorage()
  private readonly groupProjects = new ScimGroupProjectsManager()

  async listUsers(args: ScimListUsersArgs): Promise<ScimListUsersResult> {
    const { config, query } = args

    if (query.filter) {
      const found = await this.repository.findByFilter({ ssoConfigId: config.id, filter: query.filter })
      const user = found ?? (query.filter.attribute !== 'externalId' && isEmail(query.filter.value)
        ? await this.linkExistingMember({ ...args, email: query.filter.value.toLowerCase(), userName: query.filter.value })
        : null)
      const users = user ? [user] : []
      return { users: users.slice(query.startIndex - 1, query.startIndex - 1 + query.count), totalResults: users.length }
    }

    const [totalResults, users] = await Promise.all([
      this.repository.countForConfig(config.id),
      this.repository.listPage({ ssoConfigId: config.id, offset: query.startIndex - 1, limit: query.count }),
    ])
    return { users, totalResults }
  }

  async getUser(args: ScimUserByIdArgs): Promise<ScimUsersSchemaTypeForSelect> {
    const user = await this.repository.findByScimId({ ssoConfigId: args.config.id, scimId: args.scimId })
    if (!user) throw new ScimError({ status: 404, detail: 'User not found' })
    return user
  }

  async createUser(args: ScimCreateUserArgs): Promise<ScimUsersSchemaTypeForSelect> {
    const { org, config, attributes } = args
    this.assertAllowedDomain({ ...args, email: attributes.email })

    const conflict = await this.repository.findConflict({ ssoConfigId: config.id, attributes })
    if (conflict) throw new ScimError({ status: 409, scimType: 'uniqueness', detail: 'User already exists' })

    const member = await this.orgRepo.getMemberByEmail(org.id, attributes.email)
    if (!member && attributes.active) {
      const added = await this.orgRepo.addMember(org.id, attributes.email, config.defaultOrgRole)
      if (!added) throw new ScimError({ status: 500, detail: 'Failed to add the user to the organization' })
    }

    // An existing member provisioned as inactive starts active so the usual deactivation revokes their access
    const startsActive = attributes.active || !!member
    const created = await this.repository.insert({
      ssoConfigId: config.id,
      scimId: crypto.randomUUID(),
      userName: attributes.userName,
      email: attributes.email,
      memberEmail: attributes.email,
      externalId: attributes.externalId,
      displayName: attributes.displayName,
      givenName: attributes.givenName,
      familyName: attributes.familyName,
      active: startsActive,
      suspendedMembership: startsActive ? null : { role: config.defaultOrgRole, goals: [], suspendedAt: new Date().toISOString() },
    })
    if (!created) throw new ScimError({ status: 500, detail: 'Failed to create user' })
    $logger.info(`SCIM: provisioned user ${created.scimId} in org ${org.id}`)

    if (startsActive && !attributes.active) {
      return await this.applyChanges({ org, config, user: created, next: attributes })
    }
    return created
  }

  async replaceUser(args: ScimReplaceUserArgs): Promise<ScimUsersSchemaTypeForSelect> {
    const user = await this.getUser(args)
    return await this.applyChanges({ org: args.org, config: args.config, user, next: args.attributes })
  }

  async patchUser(args: ScimPatchUserArgs): Promise<ScimUsersSchemaTypeForSelect> {
    const user = await this.getUser(args)
    const next = applyPatchOperations({ current: attributesOf(user), operations: args.operations })
    return await this.applyChanges({ org: args.org, config: args.config, user, next })
  }

  async deleteUser(args: ScimUserByIdArgs): Promise<void> {
    const user = await this.getUser(args)
    if (user.active) await this.revokeAccess({ org: args.org, config: args.config, email: user.memberEmail })
    await this.repository.deleteById(user.id)
    $logger.info(`SCIM: deleted user ${user.scimId} from org ${args.org.id}`)
  }

  private async applyChanges(args: ScimApplyChangesArgs): Promise<ScimUsersSchemaTypeForSelect> {
    const { org, config, user, next } = args

    const identityChanged = next.userName.toLowerCase() !== user.userName.toLowerCase()
      || next.email !== user.email
      || next.externalId !== user.externalId
    if (identityChanged) {
      const conflict = await this.repository.findConflict({ ssoConfigId: config.id, attributes: next, excludeId: user.id })
      if (conflict) throw new ScimError({ status: 409, scimType: 'uniqueness', detail: 'Another user already has this userName, email or externalId' })
    }

    if (user.active && !next.active) await this.assertNotOwner({ org, config, email: user.memberEmail })

    let memberEmail = user.memberEmail
    if (next.email !== user.email) {
      this.assertAllowedDomain({ org, config, email: next.email })
      memberEmail = await this.changeEmail({ org, config, memberEmail, email: next.email, active: user.active })
    }

    let suspendedMembership = user.suspendedMembership
    if (user.active && !next.active) {
      suspendedMembership = await this.revokeAccess({ org, config, email: memberEmail })
      $logger.info(`SCIM: deactivated user ${user.scimId} in org ${org.id}`)
    } else if (!user.active && next.active) {
      await this.reactivate({ org, config, email: memberEmail, suspended: user.suspendedMembership })
      suspendedMembership = null
      $logger.info(`SCIM: reactivated user ${user.scimId} in org ${org.id}`)
    }

    const updated = await this.repository.update({ id: user.id, values: { ...next, memberEmail, suspendedMembership } })
    if (!updated) throw new ScimError({ status: 500, detail: 'Failed to update user' })

    if (!user.active && next.active) {
      const suspendedAt = user.suspendedMembership?.suspendedAt
      await this.groupProjects.addToLinkedProjects({
        orgId: org.id,
        scimUserIds: [user.id],
        since: suspendedAt ? new Date(suspendedAt) : user.updatedAt,
      })
    }
    return updated
  }

  private isAllowedDomain(args: ScimEmailArgs): boolean {
    return args.email.split('@')[1] === args.config.emailDomainRestriction.toLowerCase()
  }

  private assertAllowedDomain(args: ScimEmailArgs) {
    if (!this.isAllowedDomain(args)) {
      throw new ScimError({ status: 400, scimType: 'invalidValue', detail: `Email domain must be ${args.config.emailDomainRestriction.toLowerCase()}` })
    }
  }

  // Returns the address the person holds in this organization after the change
  private async changeEmail(args: ScimChangeEmailArgs): Promise<string> {
    // An account renames itself everywhere at its next SSO sign-in, where the IdP identity is proven.
    // Renaming here too would leave two rows for the new address and block that sign-in.
    const account = await this.authModel.getUserByLogin(args.memberEmail, true)
    if (account) return args.memberEmail
    if (!args.active) return args.email

    // Nobody has signed in with the old address yet: only this organization's invitation moves
    const moved = await this.repository.moveOrgMembership({ orgId: args.org.id, oldEmail: args.memberEmail, email: args.email })
    if (!moved) {
      throw new ScimError({ status: 409, scimType: 'uniqueness', detail: 'This email is already used in the organization' })
    }
    return args.email
  }

  private async assertNotOwner(args: ScimEmailArgs) {
    const account = await this.authModel.getUserByLogin(args.email, true)
    if (account && account.id === args.org.ownerId) {
      throw new ScimError({ status: 400, scimType: 'mutability', detail: 'The organization owner cannot be deactivated over SCIM' })
    }
  }

  private async revokeAccess(args: ScimEmailArgs): Promise<ScimSuspendedMembership> {
    const { org, config, email } = args
    await this.assertNotOwner(args)
    const account = await this.authModel.getUserByLogin(email, true)

    const snapshot = await this.repository.snapshotMembership({ orgId: org.id, email })
    await this.orgRepo.removeMember(org.id, email)
    await this.orgRepo.removeUserFromOrgGoals(org.id, email)

    if (account) {
      await this.ssoRepo.deleteIdentityByUser(account.id, config.id)
      await this.sessionStorage.deleteAllSessions(account.id)
    }

    return { ...(snapshot ?? { role: config.defaultOrgRole, goals: [] }), suspendedAt: new Date().toISOString() }
  }

  private async reactivate(args: ScimReactivateArgs) {
    const { org, config, email, suspended } = args
    await this.orgRepo.addMember(org.id, email, suspended?.role ?? config.defaultOrgRole)
    const restored = await this.repository.restoreGoals({ orgId: org.id, email, goals: suspended?.goals ?? [] })
    if (!restored) $logger.error(`SCIM: failed to restore project access in org ${org.id}`)
  }

  private async linkExistingMember(args: ScimLinkMemberArgs): Promise<ScimUsersSchemaTypeForSelect | null> {
    if (!this.isAllowedDomain(args)) return null
    const member = await this.orgRepo.getMemberByEmail(args.org.id, args.email)
    if (!member) return null

    // The email already belongs to a provisioned user with another userName: no match for this one
    const byEmail = await this.repository.findByFilter({ ssoConfigId: args.config.id, filter: { attribute: 'email', value: args.email } })
    if (byEmail) return null

    return await this.repository.insert({
      ssoConfigId: args.config.id,
      scimId: args.email,
      userName: args.userName,
      email: args.email,
      memberEmail: args.email,
    })
  }
}
