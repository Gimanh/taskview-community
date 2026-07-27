import type { IntegrationProvider } from 'taskview-api'
import type { IntegrationProviderMeta } from './integrationProviders.types'

export const INTEGRATION_PROVIDERS: Record<IntegrationProvider, IntegrationProviderMeta> = {
  github: { label: 'GitHub', icon: 'i-mdi-github' },
  gitlab: { label: 'GitLab', icon: 'i-mdi-gitlab' },
  gitea: { label: 'Gitea', icon: 'i-tv-gitea' },
}
