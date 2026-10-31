import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { ImportAttachment, ImportNoteLabels, ImportStructure, ImportTask } from '../../core/import-provider.types';
import { TRELLO_DEFAULT_LABEL_COLOR, TRELLO_LABEL_COLORS } from './trello.constants';
import type {
    TrelloAttachment,
    TrelloCard,
    TrelloChecklist,
    TrelloLabel,
    TrelloList,
    TrelloMapperArgs,
    TrelloOptions,
} from './trello.types';

export class TrelloMapper {
    private readonly options: TrelloOptions;
    private readonly labels: ImportNoteLabels;
    private readonly lists: TrelloList[];
    private readonly cards: TrelloCard[];
    private readonly snapshot: TrelloMapperArgs['snapshot'];
    private mappedTasks: ImportTask[] | null = null;

    constructor(args: TrelloMapperArgs) {
        this.snapshot = args.snapshot;
        this.options = args.options;
        this.labels = ImportMarkdown.labels(args.locale);
        this.lists = args.snapshot.lists
            .filter((list) => args.options.includeArchived || !list.closed)
            .sort((a, b) => a.pos - b.pos);
        const listIds = new Set(this.lists.map((list) => list.id));
        this.cards = args.snapshot.cards
            .filter((card) => listIds.has(card.idList) && (args.options.includeArchived || !card.closed))
            .sort((a, b) => a.pos - b.pos);
    }

    structure(): ImportStructure {
        const containers = this.lists.map((list) => ({ externalId: list.id, name: ImportMarkdown.text(list.name) || '—' }));
        return {
            projectName: ImportMarkdown.text(this.snapshot.board.name) || 'Trello',
            projectDescription: this.snapshot.board.desc?.trim() || null,
            statuses: this.options.listAs === 'status' ? containers : [],
            lists: this.options.listAs === 'list' ? containers : [],
            tags: this.snapshot.labels.map((label) => ({
                externalId: label.id,
                name: this.labelName(label),
                color: this.labelColor(label.color),
            })),
            taskCount: this.tasks().length,
        };
    }

    tasks(): ImportTask[] {
        if (this.mappedTasks) return this.mappedTasks;
        const cardsByList = new Map<string, TrelloCard[]>();
        for (const card of this.cards) {
            const bucket = cardsByList.get(card.idList) ?? [];
            bucket.push(card);
            cardsByList.set(card.idList, bucket);
        }

        const tasks: ImportTask[] = [];
        for (const list of this.lists) {
            for (const card of cardsByList.get(list.id) ?? []) {
                tasks.push(this.cardToTask(card));
                if (this.options.checklistsAs === 'subtasks') {
                    tasks.push(...this.checklistSubtasks(card));
                }
            }
        }
        this.mappedTasks = tasks;
        return tasks;
    }

    private cardToTask(card: TrelloCard): ImportTask {
        const complete = card.dueComplete || card.closed;
        return {
            externalId: card.id,
            parentExternalId: null,
            title: ImportMarkdown.text(card.name) || card.id,
            noteMarkdown: this.cardNote(card),
            sourceUrl: this.trelloUrl(card.url),
            statusExternalId: this.options.listAs === 'status' ? card.idList : null,
            listExternalId: this.options.listAs === 'list' ? card.idList : null,
            tagExternalIds: card.idLabels ?? [],
            assigneeExternalIds: card.idMembers ?? [],
            startDate: ImportMarkdown.isoDate(card.start),
            endDate: ImportMarkdown.isoDate(card.due),
            priority: null,
            complete,
            completedAt: complete && card.dateLastActivity ? new Date(card.dateLastActivity) : null,
            attachments: this.options.includeAttachments ? this.uploadedAttachments(card) : [],
        };
    }

    private checklistSubtasks(card: TrelloCard): ImportTask[] {
        const checklists = this.sortedChecklists(card);
        const prefixWithChecklist = checklists.length > 1;
        return checklists.flatMap((checklist) =>
            [...checklist.checkItems]
                .sort((a, b) => a.pos - b.pos)
                .map((item) => {
                    const name = ImportMarkdown.text(item.name) || item.id;
                    return {
                        externalId: item.id,
                        parentExternalId: card.id,
                        title: prefixWithChecklist ? ImportMarkdown.text(`${checklist.name}: ${name}`) : name,
                        noteMarkdown: null,
                        sourceUrl: null,
                        statusExternalId: null,
                        listExternalId: this.options.listAs === 'list' ? card.idList : null,
                        tagExternalIds: [],
                        assigneeExternalIds: item.idMember ? [item.idMember] : [],
                        startDate: null,
                        endDate: ImportMarkdown.isoDate(item.due),
                        priority: null,
                        complete: item.state === 'complete',
                        completedAt: null,
                        attachments: [],
                    };
                }),
        );
    }

    private cardNote(card: TrelloCard): string | null {
        const sections: string[] = [];
        const description = card.desc?.trim();
        if (description) sections.push(description);

        if (this.options.checklistsAs === 'note') {
            for (const checklist of this.sortedChecklists(card)) {
                const items = [...checklist.checkItems]
                    .sort((a, b) => a.pos - b.pos)
                    .map((item) => `- [${item.state === 'complete' ? 'x' : ' '}] ${ImportMarkdown.inline(item.name)}`);
                sections.push([`**${ImportMarkdown.inline(checklist.name)}**`, ...items].join('\n'));
            }
        }

        const links = (card.attachments ?? []).filter((attachment) => !attachment.isUpload && ImportMarkdown.httpUrl(attachment.url));
        if (links.length > 0) {
            const items = links.map((attachment) => `- [${ImportMarkdown.inline(attachment.name || attachment.url!)}](${ImportMarkdown.linkTarget(attachment.url!)})`);
            sections.push([`**${this.labels.attachments}**`, ...items].join('\n'));
        }

        const comments = this.options.commentsToNote ? this.snapshot.commentsByCard.get(card.id) ?? [] : [];
        if (comments.length > 0) {
            sections.push([`**${this.labels.comments}**`, ...comments.map((comment) => ImportMarkdown.comment(comment))].join('\n\n'));
        }

        return sections.length > 0 ? sections.join('\n\n') : null;
    }

    private uploadedAttachments(card: TrelloCard): ImportAttachment[] {
        return (card.attachments ?? [])
            .filter((attachment) => attachment.isUpload)
            .map((attachment) => this.toAttachment(card.id, attachment));
    }

    private toAttachment(cardId: string, attachment: TrelloAttachment): ImportAttachment {
        const fileName = attachment.fileName || attachment.name || attachment.id;
        return {
            externalId: attachment.id,
            name: attachment.name || fileName,
            mimeType: attachment.mimeType || 'application/octet-stream',
            sizeBytes: attachment.bytes ?? null,
            downloadRef: JSON.stringify({ cardId, attachmentId: attachment.id, fileName }),
        };
    }

    private sortedChecklists(card: TrelloCard): TrelloChecklist[] {
        return [...(card.checklists ?? [])].sort((a, b) => a.pos - b.pos);
    }

    private labelName(label: TrelloLabel): string {
        const name = ImportMarkdown.text(label.name ?? '');
        if (name) return name;
        return label.color ? label.color.replace(/_/g, ' ') : '—';
    }

    private labelColor(color: string | null): string {
        return (color && TRELLO_LABEL_COLORS[color]) || TRELLO_DEFAULT_LABEL_COLOR;
    }

    private trelloUrl(url: string | null): string | null {
        return url && ImportMarkdown.httpsUrlOnHost(url, 'trello.com') ? url : null;
    }
}
