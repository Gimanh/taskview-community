import { describe, expect, it } from 'vitest';
import { FileContentPolicy } from '../FileContentPolicy';

const inline = (mimeType: string) => FileContentPolicy.delivery({ mimeType, inline: true });
const attachment = (mimeType: string) => FileContentPolicy.delivery({ mimeType, inline: false });

const SHOWN_AS_IS = [
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
    'text/plain',
];

describe('FileContentPolicy', () => {
    it('shows in place, under their own type, only the listed pictures, media, PDF and plain text', () => {
        for (const mimeType of SHOWN_AS_IS) {
            expect(inline(mimeType)).toEqual({ contentType: mimeType, disposition: 'inline', sandboxed: true });
        }
        expect(inline('application/pdf')).toEqual({ contentType: 'application/pdf', disposition: 'inline', sandboxed: false });
    });

    it('shows listed data in place only as plain text', () => {
        for (const mimeType of ['text/csv', 'text/markdown', 'application/json']) {
            expect(inline(mimeType)).toEqual({ contentType: 'text/plain; charset=utf-8', disposition: 'inline', sandboxed: true });
        }
    });

    it('sends everything that is not listed as a download, even when asked to show it', () => {
        const unlisted = [
            'text/html',
            'application/xhtml+xml',
            'text/javascript',
            'application/javascript',
            'text/css',
            'text/xml',
            'application/xml',
            'image/svg+xml',
            'image/tiff',
            'image/x-icon',
            'video/x-matroska',
            'audio/x-ms-wma',
            'text/x-python',
            'text/calendar',
            'application/octet-stream',
            'application/zip',
            'application/x-msdownload',
            'application/vnd.ms-excel',
            'application/x-shockwave-flash',
            'multipart/form-data',
            'made/up',
            '',
        ];
        for (const mimeType of unlisted) {
            expect(inline(mimeType)).toEqual({ contentType: mimeType, disposition: 'attachment', sandboxed: true });
        }
    });

    it('reads the type whatever its case and parameters', () => {
        expect(inline(' Image/PNG ')).toMatchObject({ disposition: 'inline' });
        expect(inline('Text/CSV; charset=utf-8')).toEqual({ contentType: 'text/plain; charset=utf-8', disposition: 'inline', sandboxed: true });
        expect(inline('application/pdf; name="a.pdf"')).toMatchObject({ disposition: 'inline', sandboxed: false });
        expect(inline('TEXT/HTML; charset=utf-8')).toEqual({ contentType: 'TEXT/HTML; charset=utf-8', disposition: 'attachment', sandboxed: true });
        expect(inline('text/plain-but-not-really')).toMatchObject({ disposition: 'attachment' });
    });

    it('sends a download under the stored type, listed or not, and sandboxes it all the same', () => {
        expect(attachment('text/html')).toEqual({ contentType: 'text/html', disposition: 'attachment', sandboxed: true });
        expect(attachment('image/png')).toEqual({ contentType: 'image/png', disposition: 'attachment', sandboxed: true });
        expect(attachment('text/csv')).toEqual({ contentType: 'text/csv', disposition: 'attachment', sandboxed: true });
        expect(attachment('application/pdf')).toEqual({ contentType: 'application/pdf', disposition: 'attachment', sandboxed: false });
    });
});
