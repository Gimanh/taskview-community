import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import type {
    BuildRedirectUrlArgs,
    MatchRedirectUriArgs,
    ResourceMatchArgs,
    VerifyPkceArgs,
} from './types'

export function isDcrEnabled(): boolean {
    const raw = process.env.OAUTH_DYNAMIC_REGISTRATION
    if (raw === undefined || raw.trim() === '') return true
    return raw.trim().toLowerCase() === 'true'
}

export function sha256Hex(value: string): string {
    return createHash('sha256').update(value).digest('hex')
}

export function randomToken(): string {
    return randomBytes(32).toString('hex')
}

export function safeCompareHex(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
}

export function verifyPkce(args: VerifyPkceArgs): boolean {
    if (args.codeVerifier.length < 43 || args.codeVerifier.length > 128) return false
    const digest = createHash('sha256').update(args.codeVerifier).digest('base64url')
    return safeCompareHex(digest, args.codeChallenge)
}

function isLoopbackUrl(url: URL): boolean {
    return url.hostname === '127.0.0.1'
        || url.hostname === '::1'
        || url.hostname === '[::1]'
        || url.hostname === 'localhost'
}

/**
 * Exact match, with one carve-out: RFC 8252 lets a native client bind an
 * arbitrary loopback port, so the port is ignored for 127.0.0.1 / ::1 only.
 * Everything else must match the registered string exactly — this is the guard
 * against turning /authorize into an open redirect.
 */
export function matchesRegisteredRedirectUri(args: MatchRedirectUriArgs): boolean {
    if (args.registered.includes(args.candidate)) return true

    let candidateUrl: URL
    try {
        candidateUrl = new URL(args.candidate)
    } catch {
        return false
    }
    if (!isLoopbackUrl(candidateUrl)) return false

    return args.registered.some((registered) => {
        try {
            const registeredUrl = new URL(registered)
            return (
                isLoopbackUrl(registeredUrl)
                && registeredUrl.protocol === candidateUrl.protocol
                && registeredUrl.hostname === candidateUrl.hostname
                && registeredUrl.pathname === candidateUrl.pathname
            )
        } catch {
            return false
        }
    })
}

export function isAcceptableRedirectUri(raw: string): boolean {
    let parsed: URL
    try {
        parsed = new URL(raw)
    } catch {
        return false
    }
    if (parsed.hash) return false
    if (parsed.protocol === 'https:') return true
    // http is allowed only on loopback. There is deliberately no NODE_ENV escape
    // hatch: an install running without NODE_ENV=production would otherwise let
    // any client register a plaintext redirect to a host it does not control.
    if (parsed.protocol === 'http:') return isLoopbackUrl(parsed)
    return false
}

export function buildRedirectUrl(args: BuildRedirectUrlArgs): string {
    const url = new URL(args.redirectUri)
    for (const [key, value] of Object.entries(args.params)) {
        if (value !== undefined) url.searchParams.set(key, value)
    }
    return url.toString()
}

/**
 * RFC 8707 audience binding: a token minted for one MCP resource must not be
 * replayable against another. Compared on origin + path, ignoring trailing slash.
 */
export function resourceMatches(args: ResourceMatchArgs): boolean {
    if (!args.granted || !args.requested) return true
    const normalize = (value: string) => value.replace(/\/+$/, '').toLowerCase()
    return normalize(args.granted) === normalize(args.requested)
}
