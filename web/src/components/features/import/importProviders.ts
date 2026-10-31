import type { ImportProviderMeta } from './importProviders.types'

export const IMPORT_PROVIDERS: Record<string, ImportProviderMeta> = {
  trello: {
    label: 'Trello',
    icon: 'i-mdi-trello',
    sourceHost: 'trello.com',
    manualHelpUrl: 'https://trello.com/power-ups/admin',
  },
  todoist: {
    label: 'Todoist',
    icon: 'i-lucide-circle-check-big',
    sourceHost: 'app.todoist.com',
    manualHelpUrl: 'https://app.todoist.com/app/settings/integrations/developer',
  },
  'jira-cloud': {
    label: 'Jira Cloud',
    icon: 'i-mdi-jira',
    sourceHost: 'atlassian.net',
    manualHelpUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
  },
  'jira-dc': {
    label: 'Jira Data Center',
    icon: 'i-mdi-jira',
    sourceHost: null,
    manualHelpUrl: null,
  },
}

export const IMPORT_POPUP_MESSAGE_TYPE = 'tv-import-auth'
