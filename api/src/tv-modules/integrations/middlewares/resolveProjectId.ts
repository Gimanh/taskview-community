import type { Request } from 'express';
import { IntegrationsRepository } from '../IntegrationsRepository';

/**
 * Resolves the project to authorize the request against.
 *
 * When the request names an integration, the project is derived from that
 * integration and a projectId supplied by the caller is ignored: every handler
 * that takes an integration id acts on the integration, so authorizing a
 * caller-supplied project would guard a different object than the one touched.
 *
 * Only create and fetch carry no integration id — there the project itself is
 * the object being acted on, so it is read from the request.
 */
export async function resolveProjectId(req: Request): Promise<number | null> {
    const integrationId = Number(req.body?.integrationId || req.query?.integrationId || req.body?.id);
    if (integrationId && !isNaN(integrationId)) {
        const repo = new IntegrationsRepository();
        const integration = await repo.fetchById(integrationId);
        return integration?.projectId ?? null;
    }

    const projectId = Number(req.body?.projectId || req.query?.projectId);
    if (!projectId || isNaN(projectId)) return null;

    return projectId;
}
