import { createHash, randomBytes } from 'crypto'
import { type } from 'arktype'
import { hashSync } from 'bcryptjs'
import type { Request, Response } from 'express'
import { $logger } from '../../modules/logget'
import { logError } from '../../utils/api'
import { generateString, isEmail } from '../../utils/helpers'
import AuthModel from '../auth/AuthModel'
import { OrganizationRepository } from '../organizations/OrganizationRepository'
import { createSsoProvider } from './providers/provider-factory'
import { SsoRepository } from './SsoRepository'
import { parseSamlMetadata } from './saml-metadata-parser'
import { generateLoginCode, stripSecrets, validateMetadataUrl } from './sso.utils'
import { SsoConfigArkTypeCreate, SsoConfigArkTypeUpdate } from './types'

export class SsoController {
  private readonly ssoRepo = new SsoRepository()
  private readonly authModel = new AuthModel()
  private readonly orgRepo = new OrganizationRepository()

  initiateLogin = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).tvJson({ message: 'Invalid config ID' })

    const config = await this.ssoRepo.findEnabledById(configId)
    if (!config) return res.status(404).tvJson({ message: 'SSO provider not found' })

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

    try {
      const provider = createSsoProvider(config)
      const ssoResult = await provider.handleCallback(req)

      if (config.emailDomainRestriction) {
        const domain = ssoResult.email.split('@')[1]
        if (domain !== config.emailDomainRestriction) {
          return res.status(403).tvJson({ message: 'Email domain not allowed for this SSO provider' })
        }
      }

      let userData = await this.authModel.getUserByLogin(ssoResult.email, isEmail(ssoResult.email))

      if (!userData) {
        const password = generateString(16)
        const login = generateString(7)
        const id = await this.authModel.registerUserInDb({
          login,
          email: ssoResult.email,
          password: hashSync(password, 10),
          block: 0,
          confirmEmailCode: '',
        })

        if (!id) {
          $logger.error('Failed to create user during SSO login')
          return res.status(500).tvJson({ message: 'Failed to create user' })
        }

        const personalOrgSlug = `org-${crypto.randomUUID().slice(0, 8)}`
        const personalOrg = await this.orgRepo.create({ name: `${login}'s workspace`, slug: personalOrgSlug }, id, true)
        if (personalOrg) {
          await this.orgRepo.addMember(personalOrg.id, ssoResult.email, 'owner')
        }

        userData = await this.authModel.getUserByLogin(ssoResult.email, isEmail(ssoResult.email))
      }

      if (!userData) {
        return res.status(500).tvJson({ message: 'Failed to resolve user after SSO login' })
      }

      await this.orgRepo.addMember(config.organizationId, ssoResult.email, config.defaultOrgRole)

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
    if (!config) return res.tvJson(null)

    return res.tvJson({
      id: config.id,
      displayName: config.displayName,
      protocol: config.protocol,
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

    const existing = await this.ssoRepo.findEnabledByDomain(out.emailDomainRestriction)
    if (existing) {
      return res.status(409).tvJson({ message: 'SSO config for this domain already exists' })
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

    const config = await req.appUser.ssoManager.updateConfig(configId, out).catch(logError)
    return res.tvJson(config ? stripSecrets(config) : null)
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
