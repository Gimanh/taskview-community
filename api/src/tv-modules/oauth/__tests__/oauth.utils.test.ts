import { describe, it, expect } from 'vitest'
import { createHash, randomBytes } from 'crypto'
import {
    buildRedirectUrl,
    isAcceptableRedirectUri,
    matchesRegisteredRedirectUri,
    resourceMatches,
    verifyPkce,
} from '../oauth.utils'

const challengeFor = (verifier: string) =>
    createHash('sha256').update(verifier).digest('base64url')

describe('verifyPkce', () => {
    const verifier = randomBytes(40).toString('base64url')

    it('accepts the verifier that produced the challenge', () => {
        expect(verifyPkce({ codeVerifier: verifier, codeChallenge: challengeFor(verifier) })).toBe(true)
    })

    it('rejects a different verifier', () => {
        const other = randomBytes(40).toString('base64url')
        expect(verifyPkce({ codeVerifier: other, codeChallenge: challengeFor(verifier) })).toBe(false)
    })

    it('rejects a verifier shorter than the RFC 7636 minimum', () => {
        const short = 'abc'
        expect(verifyPkce({ codeVerifier: short, codeChallenge: challengeFor(short) })).toBe(false)
    })

    it('rejects a verifier longer than the RFC 7636 maximum', () => {
        const long = 'a'.repeat(129)
        expect(verifyPkce({ codeVerifier: long, codeChallenge: challengeFor(long) })).toBe(false)
    })
})

describe('matchesRegisteredRedirectUri', () => {
    it('accepts an exact match', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'https://chat.example.com/callback',
            registered: ['https://chat.example.com/callback'],
        })).toBe(true)
    })

    it('rejects a different path on the same host', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'https://chat.example.com/evil',
            registered: ['https://chat.example.com/callback'],
        })).toBe(false)
    })

    it('rejects an attacker host that merely prefixes the registered one', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'https://chat.example.com.evil.test/callback',
            registered: ['https://chat.example.com/callback'],
        })).toBe(false)
    })

    it('allows any loopback port for the same path (RFC 8252)', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'http://127.0.0.1:55123/callback',
            registered: ['http://127.0.0.1:8080/callback'],
        })).toBe(true)
    })

    it('does not extend the loopback port carve-out to other hosts', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'https://example.com:9999/callback',
            registered: ['https://example.com:443/callback'],
        })).toBe(false)
    })

    it('rejects a loopback candidate whose path differs', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'http://127.0.0.1:55123/other',
            registered: ['http://127.0.0.1:8080/callback'],
        })).toBe(false)
    })

    it('rejects an unparseable candidate', () => {
        expect(matchesRegisteredRedirectUri({
            candidate: 'not a url',
            registered: ['https://chat.example.com/callback'],
        })).toBe(false)
    })
})

describe('isAcceptableRedirectUri', () => {
    it('accepts https', () => {
        expect(isAcceptableRedirectUri('https://example.com/cb')).toBe(true)
    })

    it('accepts loopback http', () => {
        expect(isAcceptableRedirectUri('http://127.0.0.1:1234/cb')).toBe(true)
    })

    it('rejects a URI carrying a fragment', () => {
        expect(isAcceptableRedirectUri('https://example.com/cb#token')).toBe(false)
    })

    it('rejects a non-http scheme', () => {
        expect(isAcceptableRedirectUri('javascript:alert(1)')).toBe(false)
    })
})

describe('buildRedirectUrl', () => {
    it('appends parameters and skips undefined ones', () => {
        const url = buildRedirectUrl({
            redirectUri: 'https://example.com/cb?existing=1',
            params: { code: 'abc', state: undefined },
        })
        expect(url).toBe('https://example.com/cb?existing=1&code=abc')
    })

    it('encodes parameter values', () => {
        const url = buildRedirectUrl({
            redirectUri: 'https://example.com/cb',
            params: { state: 'a b&c' },
        })
        expect(url).toContain('state=a+b%26c')
    })
})

describe('resourceMatches', () => {
    it('ignores a trailing slash', () => {
        expect(resourceMatches({ granted: 'https://mcp.example.com/', requested: 'https://mcp.example.com' })).toBe(true)
    })

    it('rejects a token replayed against another resource', () => {
        expect(resourceMatches({ granted: 'https://mcp.example.com', requested: 'https://other.example.com' })).toBe(false)
    })

    it('is permissive when the grant carries no audience', () => {
        expect(resourceMatches({ granted: null, requested: 'https://mcp.example.com' })).toBe(true)
    })
})
