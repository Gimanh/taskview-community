import { IntegrationsRepository } from '../IntegrationsRepository';
import type { ResolveIntegrationProjectArgs } from '../types';

/**
 * Resolves the project to authorize against from exactly one request field —
 * the same field the route's handler acts on. Every other field is ignored, so
 * a caller cannot pass one object to the guard and another to the handler.
 */
export async function resolveProjectId(args: ResolveIntegrationProjectArgs): Promise<number | null> {
    const container = args.target.location === 'body' ? args.req.body : args.req.query;
    const id = Number(container?.[args.target.field]);
    if (!Number.isInteger(id) || id <= 0) return null;

    if (args.target.source === 'project') return id;

    const integration = await new IntegrationsRepository().fetchById(id);
    return integration?.projectId ?? null;
}
