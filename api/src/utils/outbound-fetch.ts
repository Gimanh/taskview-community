import { Agent, fetch, type Response } from 'undici';
import { OutboundUrlError } from './OutboundUrlError';
import { guardedLookup, parseOutboundUrl } from './outbound-url';
import type { OutboundFetchArgs } from './outbound-url.types';

const guardedAgent = new Agent({ connect: { lookup: guardedLookup } });

function findOutboundUrlError(err: unknown): OutboundUrlError | null {
    for (let current = err, depth = 0; current instanceof Error && depth < 5; current = current.cause, depth++) {
        if (current instanceof OutboundUrlError) return current;
    }
    return null;
}

export async function outboundFetch(args: OutboundFetchArgs): Promise<Response> {
    const parsed = parseOutboundUrl(args);

    try {
        return await fetch(parsed, { ...args.init, dispatcher: args.allowPrivate ? undefined : guardedAgent });
    } catch (err) {
        throw findOutboundUrlError(err) ?? err;
    }
}
