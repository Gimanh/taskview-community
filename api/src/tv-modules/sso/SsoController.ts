import { createHash, randomBytes } from 'crypto'
import { type } from 'arktype'
import { hashSync } from 'bcryptjs'
import type { Request, Response } from 'express'
import { $logger } from '../../modules/logget'
import { PublicApiUrl } from '../../modules/public-url'
import { logError } from '../../utils/api'
import { generateLetters, generateString } from '../../utils/helpers'
import AuthModel from '../auth/AuthModel'
import { GoalsRepository } from '../goals/GoalsRepository'
import { OrganizationRepository } from '../organizations/OrganizationRepository'
import { createSsoProvider } from './providers/provider-factory'
import { SsoRepository } from './SsoRepository'
import { parseSamlMetadata } from './saml-metadata-parser'
import { generateLoginCode, isSsoDomainVerified, stripSecrets, validateMetadataUrl } from './sso.utils'
import {
  SsoConfigArkTypeCreate,
  SsoConfigArkTypeUpdate,
  SsoDomainNotVerifiedError,
  type ApplySsoIdpEmailArgs,
  type ResolveSsoUserArgs,
  type ResolveSsoUserResult,
  type SsoCallbackError,
} from './types'
import type { UserDbRecord } from '../../types/auth.types'

export class SsoController {
  private readonly ssoRepo = new SsoRepository()
  private readonly authModel = new AuthModel()
  private readonly orgRepo = new OrganizationRepository()
  private readonly goalsRepo = new GoalsRepository()

  private async resolveLogin(preferredUsername?: string): Promise<string> {
    const base = preferredUsername?.trim().slice(0, 50)
    if (!base) return generateString(7)

    if (!(await this.authModel.getUserByLogin(base))) return base

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = `.${generateLetters(3)}`
      const candidate = `${base.slice(0, 50 - suffix.length)}${suffix}`
      if (!(await this.authModel.getUserByLogin(candidate))) return candidate
    }

    return generateString(7)
  }

  private redirectSsoError(res: Response, error: SsoCallbackError) {
    return res.redirect(`${process.env.APP_URL}/login?sso_error=${error}`)
  }

  private async createSsoUser(args: ResolveSsoUserArgs): Promise<UserDbRecord | false> {
    const password = generateString(16)
    const login = await this.resolveLogin(args.preferredUsername)
    const id = await this.authModel.registerUserInDb({
      login,
      email: args.email,
      password: hashSync(password, 10),
      block: 0,
      confirmEmailCode: '',
    })

    if (!id) {
      $logger.error('Failed to create user during SSO login')
      return false
    }

    const personalOrgSlug = `org-${crypto.randomUUID().slice(0, 8)}`
    const personalOrg = await this.orgRepo.create({ name: `${login}'s workspace`, slug: personalOrgSlug }, id, true)
    if (personalOrg) {
      await this.orgRepo.addMember(personalOrg.id, args.email, 'owner')
      await this.goalsRepo.createInboxGoal({ ownerId: id, organizationId: personalOrg.id })
    }

    return await this.authModel.fetchUserById(id)
  }

  private async applyIdpEmail(args: ApplySsoIdpEmailArgs): Promise<'ok' | 'email_in_use' | 'error'> {
    if (args.user.email.toLowerCase() === args.email) return 'ok'

    const taken = await this.authModel.getUserByLogin(args.email, true)
    if (taken && taken.id !== args.user.id) return 'email_in_use'

    const result = await this.authModel.updateUserEmail({
      userId: args.user.id,
      oldEmail: args.user.email,
      email: args.email,
    })
    if (result === 'conflict') return 'email_in_use'
    if (result !== 'ok') return 'error'
    return 'ok'
  }

  private async resolveSsoUser(args: ResolveSsoUserArgs): Promise<ResolveSsoUserResult> {
    const identity = await this.ssoRepo.findIdentity({
      ssoConfigId: args.ssoConfigId,
      externalId: args.externalId,
    })

    if (identity) {
      const user = await this.authModel.fetchUserById(identity.userId)
      if (!user) return { ok: false, error: 'authentication_failed' }

      const emailResult = await this.applyIdpEmail({ user, email: args.email })
      if (emailResult === 'email_in_use') return { ok: false, error: 'email_in_use' }
      if (emailResult !== 'ok') return { ok: false, error: 'authentication_failed' }

      const refreshed = await this.authModel.fetchUserById(user.id)
      if (!refreshed) return { ok: false, error: 'authentication_failed' }
      return { ok: true, user: refreshed }
    }

    const existing = await this.authModel.getUserByLogin(args.email, true)
    if (existing) {
      const linked = await this.ssoRepo.findIdentityByUser({
        ssoConfigId: args.ssoConfigId,
        userId: existing.id,
      })
      if (linked && linked.externalId !== args.externalId) {
        return { ok: false, error: 'email_in_use' }
      }
      return { ok: true, user: existing }
    }

    const created = await this.createSsoUser(args)
    if (!created) return { ok: false, error: 'authentication_failed' }
    return { ok: true, user: created }
  }

  initiateLogin = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).tvJson({ message: 'Invalid config ID' })

    const config = await this.ssoRepo.findEnabledById(configId)
    if (!config) return res.status(404).tvJson({ message: 'SSO provider not found' })

    if (!isSsoDomainVerified(config)) {
      return res.redirect(`${process.env.APP_URL}/login?sso_error=domain_unverified`)
    }

    try {
      const provider = createSsoProvider(config)
      const relayState = JSON.stringify({ platform: req.query.platform || '' })
      await provider.initiateLogin(req, res, relayState)
    } catch (error) {
      $logger.error(error, `SSO initiate login error for config ${configId}`)
      return res.status(500).tvJson({ message: 'Failed to initiate SSO login' })
    }
  }

  handleCallback = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).tvJson({ message: 'Invalid config ID' })

    const config = await this.ssoRepo.findEnabledById(configId)
    if (!config) return res.status(404).tvJson({ message: 'SSO provider not found' })

    if (!isSsoDomainVerified(config)) {
      return res.redirect(`${process.env.APP_URL}/login?sso_error=domain_unverified`)
    }

    try {
      const provider = createSsoProvider(config)
      const ssoResult = await provider.handleCallback(req)

      if (!config.emailDomainRestriction) {
        return this.redirectSsoError(res, 'authentication_failed')
      }

      const domain = ssoResult.email.split('@')[1]
      if (domain !== config.emailDomainRestriction) {
        return res.status(403).tvJson({ message: 'Email domain not allowed for this SSO provider' })
      }

      const resolved = await this.resolveSsoUser({
        ssoConfigId: config.id,
        email: ssoResult.email,
        externalId: ssoResult.externalId,
        preferredUsername: ssoResult.preferredUsername,
      })
      if (!resolved.ok) {
        return this.redirectSsoError(res, resolved.error)
      }

      const userData = resolved.user

      await this.orgRepo.addMember(config.organizationId, userData.email, config.defaultOrgRole)

      await this.ssoRepo.upsertIdentity({
        userId: userData.id,
        ssoConfigId: config.id,
        externalId: ssoResult.externalId,
        email: ssoResult.email,
      })

      const code = generateLoginCode()
      await this.authModel.updateLoginCode(code, userData.email)

      const authData = {
        code: code.split(':')[0],
        email: userData.email,
      }
      const encodedAuthData = encodeURIComponent(JSON.stringify(authData))

      try {
        let relayState = req.body?.RelayState as string | undefined
        if (!relayState && req.query?.state) {
          const stateData = JSON.parse(req.query.state as string)
          relayState = stateData.relay
        }
        if (relayState) {
          const platformData = JSON.parse(relayState)
          if (platformData.platform === 'mobile') {
            return res.redirect(`taskview://login?tokens=${encodedAuthData}`)
          }
        }
      } catch { /* relay state parse error — ignore, use web redirect */ }

      return res.redirect(`${process.env.APP_URL}/login?tokens=${encodedAuthData}`)
    } catch (error) {
      $logger.error(error, `SSO callback error for config ${configId}`)
      return res.redirect(`${process.env.APP_URL}/login?sso_error=authentication_failed`)
    }
  }

  listPublicProviders = async (req: Request, res: Response) => {
    const domain = req.query.domain as string
    if (!domain) return res.tvJson(null)

    const config = await this.ssoRepo.findEnabledByDomain(domain)
    if (!config || !isSsoDomainVerified(config)) return res.tvJson(null)

    return res.tvJson({
      id: config.id,
      displayName: config.displayName,
      protocol: config.protocol,
    })
  }

  getPublicUrls = async (req: Request, res: Response) => {
    const base = PublicApiUrl.base(req)
    return res.tvJson({
      apiBaseUrl: base,
      callbackUrlTemplate: `${base}/module/sso/callback/{id}`,
      scimEndpointUrl: `${base}/scim/v2`,
      apiPublicUrlConfigured: PublicApiUrl.configured() !== null,
    })
  }

  listConfigs = async (req: Request, res: Response) => {
    const orgId = Number(req.query.organizationId)
    if (!orgId) return res.status(400).tvJson({ message: 'organizationId is required' })

    const configs = await this.ssoRepo.listByOrgId(orgId)
    return res.tvJson(configs.map(stripSecrets))
  }

  createConfig = async (req: Request, res: Response) => {
    const out = SsoConfigArkTypeCreate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const domain = out.emailDomainRestriction.toLowerCase()

    const sameOrg = await this.ssoRepo.findByDomainAndOrg({ domain, organizationId: out.organizationId })
    if (sameOrg) {
      return res.status(409).tvJson({ message: 'SSO config for this domain already exists' })
    }

    const verified = await this.ssoRepo.findVerifiedByDomain(domain)
    if (verified) {
      return res.status(409).tvJson({ message: 'This domain is already verified by another organization' })
    }

    const config = await req.appUser.ssoManager.createConfig(out).catch(logError)
    if (!config) {
      return res.status(500).tvJson({ message: 'Failed to create SSO config' })
    }
    return res.tvJson(stripSecrets(config))
  }

  updateConfig = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const out = SsoConfigArkTypeUpdate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    if (out.emailDomainRestriction) {
      const domain = out.emailDomainRestriction.toLowerCase()

      const verified = await this.ssoRepo.findVerifiedByDomain(domain)
      if (verified && verified.id !== configId) {
        return res.status(409).tvJson({ message: 'This domain is already verified by another organization' })
      }

      const current = await this.ssoRepo.findById(configId)
      if (current) {
        const sameOrg = await this.ssoRepo.findByDomainAndOrg({ domain, organizationId: current.organizationId })
        if (sameOrg && sameOrg.id !== configId) {
          return res.status(409).tvJson({ message: 'SSO config for this domain already exists' })
        }
      }
    }

    try {
      const config = await req.appUser.ssoManager.updateConfig(configId, out)
      return res.tvJson(config ? stripSecrets(config) : null)
    } catch (error) {
      if (error instanceof SsoDomainNotVerifiedError) {
        return res.status(403).tvJson({ message: 'Domain is not verified' })
      }
      logError(error)
      return res.tvJson(null)
    }
  }

  parseMetadata = async (req: Request, res: Response) => {
    const metadataUrl = req.query.url as string
    if (!metadataUrl) return res.status(400).tvJson({ message: 'url is required' })

    const urlError = validateMetadataUrl(metadataUrl)
    if (urlError) return res.status(400).tvJson({ message: urlError })

    try {
      const response = await fetch(metadataUrl, { redirect: 'error' })
      if (!response.ok) {
        return res.status(400).tvJson({ message: `Failed to fetch metadata: ${response.status}` })
      }

      const xml = await response.text()
      const parsed = parseSamlMetadata(xml)

      return res.tvJson(parsed)
    } catch (error) {
      $logger.error(error, 'Failed to parse SAML metadata')
      return res.status(400).tvJson({ message: 'Failed to fetch or parse metadata' })
    }
  }

  startDomainVerification = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const result = await req.appUser.ssoManager.startDomainVerification(configId).catch(logError)
    if (!result) {
      return res.status(404).tvJson({ message: 'SSO config not found' })
    }
    return res.tvJson(result)
  }

  checkDomainVerification = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const result = await req.appUser.ssoManager.checkDomainVerification(configId).catch(logError)
    if (!result) {
      return res.status(404).tvJson({ message: 'SSO config not found' })
    }
    return res.tvJson(result)
  }

  generateScimToken = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const rawToken = `tvscim_${randomBytes(32).toString('hex')}`
    const hashedToken = createHash('sha256').update(rawToken).digest('hex')

    const config = await this.ssoRepo.update(configId, {
      scimToken: hashedToken,
      scimEnabled: 1,
    })

    if (!config) {
      return res.status(404).tvJson({ message: 'SSO config not found' })
    }

    return res.tvJson({ token: rawToken })
  }

  toggleScim = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const enabled = req.body.enabled ? 1 : 0

    const config = await this.ssoRepo.update(configId, {
      scimEnabled: enabled,
      ...(enabled === 0 ? { scimToken: null } : {}),
    })

    if (!config) {
      return res.status(404).tvJson({ message: 'SSO config not found' })
    }

    return res.tvJson({ scimEnabled: config.scimEnabled })
  }

  deleteConfig = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const result = await req.appUser.ssoManager.deleteConfig(configId).catch(logError)
    return res.tvJson(!!result)
  }
}
