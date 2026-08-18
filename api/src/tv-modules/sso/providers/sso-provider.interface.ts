import type { Request, Response } from 'express'

export type SsoAuthResult = {
  email: string
  externalId: string
  displayName?: string
  preferredUsername?: string
  provider: string
}

export type SsoProvider = {
  initiateLogin(req: Request, res: Response, relayState?: string): Promise<void>
  handleCallback(req: Request): Promise<SsoAuthResult>
}
