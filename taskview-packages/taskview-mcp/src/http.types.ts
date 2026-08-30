import type { IncomingMessage, ServerResponse } from 'node:http'

export type HandleMcpRequestArgs = {
  req: IncomingMessage
  res: ServerResponse
  token: string
}

export type CorsHeadersArgs = {
  origin: string | undefined
}

export type UnauthorizedArgs = {
  req: IncomingMessage
  res: ServerResponse
  message: string
}
