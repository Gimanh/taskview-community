import { appendFileSync } from 'fs';
import type { IntegrationsDebugLogEntry } from './types';

// TEMPORARY debug instrumentation for the integrations OAuth flow.
// Remove this file and all integrationsDebugLog() calls once the Gitea
// connect issue is resolved.
const LOG_PATH = '/private/tmp/claude-501/-Users-nikolaygiman-Programming-HandScreamInc-taskview/1d568266-6fbf-457c-83c2-5c5ca619edf1/scratchpad/integrations-debug.log';

export function integrationsDebugLog(entry: IntegrationsDebugLogEntry): void {
    try {
        appendFileSync(LOG_PATH, `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`);
    } catch {
        // debug logging must never break the flow
    }
}
