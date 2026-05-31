import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { networkInterfaces } from 'os'

function getLocalIp(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

export type ReceivedWebhook = {
  body: any
  headers: Record<string, string | string[] | undefined>
}

/**
 * A tiny HTTP server the API container can POST webhook deliveries to.
 * Binds on 0.0.0.0 and advertises the host LAN IP so the Dockerized API
 * (which cannot reach `localhost`) can deliver to it.
 */
export function createWebhookReceiver() {
  const received: ReceivedWebhook[] = []
  const waiters: Array<(value: any) => void> = []

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let parsed: any = null
      try { parsed = JSON.parse(body) } catch { parsed = body }
      received.push({ body: parsed, headers: req.headers })
      if (waiters.length > 0) {
        waiters.shift()!(parsed)
      }
      res.writeHead(200)
      res.end('ok')
    })
  })

  const ip = getLocalIp()

  return {
    server,
    received,
    getUrl: () => `http://${ip}:${(server.address() as any).port}/webhook`,
    start: () => new Promise<void>((resolve) => {
      server.listen(0, '0.0.0.0', () => resolve())
    }),
    stop: () => new Promise<void>((resolve) => {
      server.close(() => resolve())
    }),
    // Reset BOTH buffers: a lingering waiter (e.g. one whose promise already
    // timed out) would otherwise consume a future delivery slot and starve the
    // next test's waitForDelivery, so the queue must be emptied alongside `received`.
    clear: () => { received.length = 0; waiters.length = 0 },
    /** Resolve with the payload of the first delivery whose `event` matches (already-received or future). */
    waitForDelivery: (event?: string, timeoutMs = 8000) => new Promise<any>((resolve, reject) => {
      const idx = event
        ? received.findIndex(r => r.body?.event === event)
        : received.length > 0 ? 0 : -1
      if (idx >= 0) {
        resolve(received[idx].body)
        return
      }

      const check = (payload: any) => {
        if (!event || payload?.event === event) {
          clearTimeout(timer)
          resolve(payload)
        } else {
          waiters.push(check)
        }
      }

      const timer = setTimeout(() => {
        // Drop our own waiter so a late delivery doesn't fire a dead resolver.
        const i = waiters.indexOf(check)
        if (i >= 0) waiters.splice(i, 1)
        reject(new Error(`No webhook delivery${event ? ` for ${event}` : ''} received within ${timeoutMs}ms`))
      }, timeoutMs)

      waiters.push(check)
    }),
  }
}
