import { describe, it, expect } from 'vitest'
import { deriveSamlEmail } from '../sso.utils'

const EMAIL_NAMEID_FORMAT = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
const PERSISTENT_NAMEID_FORMAT = 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent'
const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'

describe('deriveSamlEmail', () => {
  it('takes the email attribute and lowercases it', () => {
    expect(deriveSamlEmail({ email: 'User@Company.com', nameID: 'abc' })).toBe('user@company.com')
  })

  it('falls back to the xmlsoap emailaddress claim', () => {
    expect(deriveSamlEmail({ [EMAIL_CLAIM]: 'a@b.com', nameID: 'abc' })).toBe('a@b.com')
  })

  it('uses nameID only when the NameID Format is emailAddress', () => {
    expect(deriveSamlEmail({
      nameID: 'user@company.com',
      nameIDFormat: EMAIL_NAMEID_FORMAT,
    })).toBe('user@company.com')
  })

  it('does not use nameID for a non-email NameID Format', () => {
    expect(deriveSamlEmail({
      nameID: 'user@company.com',
      nameIDFormat: PERSISTENT_NAMEID_FORMAT,
    })).toBeNull()
  })

  it('does not use nameID when no format is provided', () => {
    expect(deriveSamlEmail({ nameID: 'user@company.com' })).toBeNull()
  })

  it('prefers the email attribute over an emailAddress-format nameID', () => {
    expect(deriveSamlEmail({
      email: 'attr@company.com',
      nameID: 'name@company.com',
      nameIDFormat: EMAIL_NAMEID_FORMAT,
    })).toBe('attr@company.com')
  })

  it('returns null for a blank or non-string email attribute', () => {
    expect(deriveSamlEmail({ email: '   ', nameID: 'abc' })).toBeNull()
    expect(deriveSamlEmail({ email: 123, nameID: 'abc' })).toBeNull()
    expect(deriveSamlEmail({ nameID: 'abc' })).toBeNull()
    expect(deriveSamlEmail({})).toBeNull()
  })
})
