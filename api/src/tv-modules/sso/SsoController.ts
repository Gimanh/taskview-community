import { type } from 'arktype'
import { hashSync } from 'bcryptjs'
import type { Request, Response } from 'express'
import { $logger } from '../../modules/logget'
import { logError } from '../../utils/api'
import { isEmail } from '../../utils/helpers'
import AuthModel from '../auth/AuthModel'
import { OrganizationRepository } from '../organizations/OrganizationRepository'
import { createSsoProvider } from './providers/provider-factory'
import { SsoRepository } from './SsoRepository'
import { parseSamlMetadata } from './saml-metadata-parser'
import { SsoConfigArkTypeCreate, SsoConfigArkTypeUpdate } from './types'

function generateRandomString(length: number): string {
  let result = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateLoginCode(): string {
  return `${generateRandomString(12)}:${Date.now()}`.toLowerCase()
}

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
        const password = generateRandomString(16)
        const login = generateRandomString(7)
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
        const relayState = req.body?.RelayState || req.query?.state
        if (relayState) {
          const platformData = JSON.parse(relayState as string)
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
    return res.tvJson(configs)
  }

  createConfig = async (req: Request, res: Response) => {
    const out = SsoConfigArkTypeCreate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const config = await req.appUser.ssoManager.createConfig(out).catch(logError)
    return res.tvJson(config ?? null)
  }

  updateConfig = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const out = SsoConfigArkTypeUpdate(req.body)
    if (out instanceof type.errors) {
      return res.status(400).send(out.summary)
    }

    const config = await req.appUser.ssoManager.updateConfig(configId, out).catch(logError)
    return res.tvJson(config ?? null)
  }

  parseMetadata = async (req: Request, res: Response) => {
    const metadataUrl = req.query.url as string
    if (!metadataUrl) return res.status(400).tvJson({ message: 'url is required' })

    try {
      const response = await fetch(metadataUrl)
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

  deleteConfig = async (req: Request, res: Response) => {
    const configId = Number(req.params.configId)
    if (!configId) return res.status(400).end()

    const result = await req.appUser.ssoManager.deleteConfig(configId).catch(logError)
    return res.tvJson(!!result)
  }
}
