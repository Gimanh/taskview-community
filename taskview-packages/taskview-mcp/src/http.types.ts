import type { IncomingMessage, ServerResponse } from 'node:http'

export type HandleMcpRequestArgs = {
  req: IncomingMessage
  res: ServerResponse
  token: string
}
