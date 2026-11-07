import type { IntegrationAccessTarget } from '../types';

export const IntegrationAccessTargets = {
    projectFromQuery: { source: 'project', location: 'query', field: 'projectId' },
    projectFromBody: { source: 'project', location: 'body', field: 'projectId' },
    integrationFromBodyId: { source: 'integration', location: 'body', field: 'id' },
    integrationFromBody: { source: 'integration', location: 'body', field: 'integrationId' },
    integrationFromQuery: { source: 'integration', location: 'query', field: 'integrationId' },
} as const satisfies Record<string, IntegrationAccessTarget>;
