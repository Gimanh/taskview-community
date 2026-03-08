import type { Request } from 'express';
import { IntegrationsRepository } from '../IntegrationsRepository';

/**
 * Resolves projectId from request.
 * Checks body (projectId, integrationId, id) and query (projectId, integrationId).
 */
export async function resolveProjectId(req: Request): Promise<number | null> {
    // Direct projectId in body or query
    const directId = req.body?.projectId ?? req.query?.projectId;
    if (directId) {
        const id = Number(directId);
        return isNaN(id) ? null : id;
    }

    // integrationId from body or query, or id from body
    const integrationId = Number(req.body?.integrationId || req.query?.integrationId || req.body?.id);
    if (!integrationId || isNaN(integrationId)) return null;

    const repo = new IntegrationsRepository();
    const integration = await repo.fetchById(integrationId);
    return integration?.projectId ?? null;
}
