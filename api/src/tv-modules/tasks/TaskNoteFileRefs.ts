import type { TaskNoteFileReplaceArgs } from './task-move.types';

export class TaskNoteFileRefs {
    private static readonly PATTERN = /data-file-id=(["'])([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\1/gi;

    static extract(note: string | null): string[] {
        if (!note) return [];
        const ids = new Set<string>();
        for (const match of note.matchAll(TaskNoteFileRefs.PATTERN)) ids.add(match[2].toLowerCase());
        return [...ids];
    }

    static replace(args: TaskNoteFileReplaceArgs): string {
        return args.note.replace(TaskNoteFileRefs.PATTERN, (whole, quote: string, id: string) => {
            const replacement = args.replacements.get(id.toLowerCase());
            return replacement ? `data-file-id=${quote}${replacement}${quote}` : whole;
        });
    }
}
