import type { ImportLocale, ImportNoteComment, ImportNoteLabels } from './import-provider.types';

const TITLE_MAX_LENGTH = 1000;

const NOTE_LABELS: Record<ImportLocale, ImportNoteLabels> = {
    en: { attachments: 'Attachments', comments: 'Comments', recurring: 'Repeats' },
    ru: { attachments: 'Вложения', comments: 'Комментарии', recurring: 'Повторяется' },
    de: { attachments: 'Anhänge', comments: 'Kommentare', recurring: 'Wiederholt sich' },
    es: { attachments: 'Adjuntos', comments: 'Comentarios', recurring: 'Se repite' },
    'pt-BR': { attachments: 'Anexos', comments: 'Comentários', recurring: 'Repete' },
};

export class ImportMarkdown {
    static labels(locale: ImportLocale): ImportNoteLabels {
        return NOTE_LABELS[locale];
    }

    static text(value: string): string {
        return value.replace(/\s+/g, ' ').trim().slice(0, TITLE_MAX_LENGTH);
    }

    static inline(value: string): string {
        return ImportMarkdown.text(value).replace(/([\\[\]*_`<>])/g, '\\$1');
    }

    static linkTarget(url: string): string {
        return url.replace(/[()\s]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
    }

    static httpUrl(url: string | null | undefined): boolean {
        if (!url) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
            return false;
        }
    }

    static httpsUrlOnHost(url: string | null | undefined, hostname: string): boolean {
        if (!url || url.length > 500) return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:' && parsed.hostname === hostname;
        } catch {
            return false;
        }
    }

    static comment(comment: ImportNoteComment): string {
        const header = `**${ImportMarkdown.inline(comment.authorName || '—')}**, ${ImportMarkdown.timestamp(comment.date)}`;
        const body = comment.text.split('\n').map((line) => `> ${line}`).join('\n');
        return `> ${header}\n>\n${body}`;
    }

    static timestamp(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
    }

    static isoDate(value: string | null | undefined): string | null {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    }
}
