import type { Request, Response } from 'express'
import { $logger } from '../../modules/logget'
import { ScimManager } from './ScimManager'
import { toScimUser, toScimList, toScimError } from './scim.helpers'

export class ScimController {
  private readonly manager = new ScimManager()

  listUsers = async (_req: Request, res: Response) => {
    const { scimOrg } = res.locals
    const members = await this.manager.listUsers(scimOrg.id)

    return res.json(toScimList(members.map(m => toScimUser(m, true))))
  }

  getUser = async (req: Request, res: Response) => {
    const { scimOrg } = res.locals
    const email = decodeURIComponent(req.params.id)

    const member = await this.manager.getUserByEmail(scimOrg.id, email)
    if (!member) {
      return res.status(404).json(toScimError(404, 'User not found'))
    }

    return res.json(toScimUser(member, true))
  }

  createUser = async (req: Request, res: Response) => {
    const { scimOrg } = res.locals
    const email = req.body.userName || req.body.emails?.[0]?.value

    if (!email) {
      return res.status(400).json(toScimError(400, 'userName or emails[0].value is required'))
    }

    await this.manager.reactivateUser(scimOrg, email)

    const member = await this.manager.getUserByEmail(scimOrg.id, email)
    if (!member) {
      return res.status(500).json(toScimError(500, 'Failed to create user'))
    }

    return res.status(201).json(toScimUser(member, true))
  }

  patchUser = async (req: Request, res: Response) => {
    const { scimOrg, scimConfig } = res.locals
    const email = decodeURIComponent(req.params.id)

    const operations = req.body.Operations || []

    for (const op of operations) {
      if (op.op === 'replace' && (op.path === 'active' || op.value?.active !== undefined)) {
        const active = op.path === 'active' ? op.value : op.value.active

        if (active === false || active === 'false') {
          const result = await this.manager.deactivateUser(scimOrg, scimConfig, email)
          if (!result) {
            return res.status(404).json(toScimError(404, 'User not found'))
          }
          $logger.info(`SCIM: deactivated user ${email} from org ${scimOrg.id}`)
          return res.json(toScimUser({ email, role: 'member' }, false))
        }

        if (active === true || active === 'true') {
          await this.manager.reactivateUser(scimOrg, email)
          $logger.info(`SCIM: reactivated user ${email} in org ${scimOrg.id}`)
          const member = await this.manager.getUserByEmail(scimOrg.id, email)
          return res.json(toScimUser(member || { email, role: 'member' }, true))
        }
      }
    }

    return res.status(200).json(toScimUser({ email, role: 'member' }, true))
  }

  deleteUser = async (req: Request, res: Response) => {
    const { scimOrg, scimConfig } = res.locals
    const email = decodeURIComponent(req.params.id)

    const result = await this.manager.deactivateUser(scimOrg, scimConfig, email)
    if (!result) {
      return res.status(404).json(toScimError(404, 'User not found'))
    }

    $logger.info(`SCIM: deleted user ${email} from org ${scimOrg.id}`)
    return res.status(204).end()
  }
}
