import type { FileContentDelivery, FileContentDeliveryArgs } from './types';

const SHOWN_AS_IS = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/avif',
    'image/bmp',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/flac',
    'application/pdf',
    'text/plain',
]);

const SHOWN_AS_TEXT = new Set(['text/csv', 'text/markdown', 'application/json']);

export class FileContentPolicy {
    static delivery(args: FileContentDeliveryArgs): FileContentDelivery {
        const mimeType = args.mimeType.split(';')[0].trim().toLowerCase();

        const sandboxed = mimeType !== 'application/pdf';

        if (args.inline && SHOWN_AS_IS.has(mimeType)) return { contentType: args.mimeType, disposition: 'inline', sandboxed };
        if (args.inline && SHOWN_AS_TEXT.has(mimeType)) return { contentType: 'text/plain; charset=utf-8', disposition: 'inline', sandboxed };
        return { contentType: args.mimeType, disposition: 'attachment', sandboxed };
    }
}
