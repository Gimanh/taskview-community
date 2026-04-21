import { DOMParser, type Document } from '@xmldom/xmldom'

type SamlMetadataResult = {
  samlEntryPoint: string
  samlCert: string
  samlLogoutUrl: string
}

export function parseSamlMetadata(xml: string): SamlMetadataResult {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')

  const entryPoint = findSsoLocation(doc)
  const cert = findSigningCertificate(doc)
  const logoutUrl = findSloLocation(doc)

  return { samlEntryPoint: entryPoint, samlCert: cert, samlLogoutUrl: logoutUrl }
}

function findSsoLocation(doc: Document): string {
  const ssoNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'SingleSignOnService')

  for (let i = 0; i < ssoNodes.length; i++) {
    const node = ssoNodes[i]
    const binding = node.getAttribute('Binding') ?? ''

    if (binding.includes('HTTP-POST') || binding.includes('HTTP-Redirect')) {
      return node.getAttribute('Location') ?? ''
    }
  }

  return ''
}

function findSloLocation(doc: Document): string {
  const sloNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'SingleLogoutService')

  for (let i = 0; i < sloNodes.length; i++) {
    const node = sloNodes[i]
    const binding = node.getAttribute('Binding') ?? ''

    if (binding.includes('HTTP-POST') || binding.includes('HTTP-Redirect')) {
      return node.getAttribute('Location') ?? ''
    }
  }

  return ''
}

function findSigningCertificate(doc: Document): string {
  const keyDescriptors = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'KeyDescriptor')

  for (let i = 0; i < keyDescriptors.length; i++) {
    const descriptor = keyDescriptors[i]
    const use = descriptor.getAttribute('use')

    if (use && use !== 'signing') continue

    const certNodes = descriptor.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate')

    if (certNodes.length > 0) {
      const certText = certNodes[0].textContent ?? ''
      return certText.replace(/[\s\r\n]/g, '')
    }
  }

  return ''
}
