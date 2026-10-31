import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { ImportAttachment, ImportNoteLabels, ImportStructure, ImportTag, ImportTask } from '../../core/import-provider.types';
import { JiraDcWikiMarkup } from './JiraDcWikiMarkup';
import { JIRA_DC_CATEGORY_ORDER, JIRA_DC_DEFAULT_LABEL_COLOR, JIRA_DC_PRIORITIES } from './jira-dc.constants';
import type {
    JiraDcIssue,
    JiraDcMapperArgs,
    JiraDcOptions,
    JiraDcPlacement,
    JiraDcStatus,
    JiraDcToTaskArgs,
    JiraDcUser,
} from './jira-dc.types';

export class JiraDcMapper {
    private readonly snapshot: JiraDcMapperArgs['snapshot'];
    private readonly siteUrl: string;
    private readonly options: JiraDcOptions;
    private readonly labels: ImportNoteLabels;
    private readonly statuses: JiraDcStatus[];
    private readonly statusIds: Set<string>;
    private readonly issues: Map<string, JiraDcIssue>;
    private readonly issuesByKey: Map<string, JiraDcIssue>;
    private readonly epicIds: Set<string>;
    private mappedTasks: ImportTask[] | null = null;

    constructor(args: JiraDcMapperArgs) {
        this.snapshot = args.snapshot;
        this.siteUrl = args.siteUrl;
        this.options = args.options;
        this.labels = ImportMarkdown.labels(args.locale);
        this.statuses = args.snapshot.statuses
            .map((status, index) => ({ status, index }))
            .sort((a, b) => this.categoryOrder(a.status) - this.categoryOrder(b.status) || a.index - b.index)
            .map(({ status }) => status);
        this.statusIds = new Set(this.statuses.map((status) => status.id));
        this.issues = new Map(args.snapshot.issues.map((issue) => [issue.id, issue]));
        this.issuesByKey = new Map(args.snapshot.issues.map((issue) => [issue.key, issue]));
        this.epicIds = new Set(
            args.snapshot.issues
                .filter((issue) => this.epicName(issue) !== null)
                .map((issue) => issue.id)
                .concat(args.snapshot.issues.map((issue) => this.epicOf(issue)?.id).filter((id): id is string => Boolean(id))),
        );
    }

    structure(): ImportStructure {
        const lists =
            this.options.epicsAs === 'list'
                ? this.snapshot.issues
                      .filter((issue) => this.epicIds.has(issue.id))
                      .map((issue) => ({ externalId: issue.id, name: ImportMarkdown.text(this.epicName(issue) ?? '') || this.title(issue) }))
                : [];
        return {
            projectName: ImportMarkdown.text(this.snapshot.project.name) || this.snapshot.project.key || 'Jira',
            projectDescription: this.snapshot.project.description?.trim() || null,
            statuses: this.statuses.map((status) => ({ externalId: status.id, name: ImportMarkdown.text(status.name) || '—' })),
            lists,
            tags: this.tags(),
            taskCount: this.tasks().length,
        };
    }

    tasks(): ImportTask[] {
        if (this.mappedTasks) return this.mappedTasks;
        const placements = new Map<string, JiraDcPlacement>();
        for (const issue of this.snapshot.issues) placements.set(issue.id, this.placement(issue));

        const children = new Map<string | null, JiraDcIssue[]>();
        for (const issue of this.snapshot.issues) {
            const parentId = placements.get(issue.id)!.parentId;
            const bucket = children.get(parentId) ?? [];
            bucket.push(issue);
            children.set(parentId, bucket);
        }

        const ordered: ImportTask[] = [];
        const visited = new Set<string>();
        const visit = (issue: JiraDcIssue, listId: string | null) => {
            if (visited.has(issue.id)) return;
            visited.add(issue.id);
            const placement = placements.get(issue.id)!;
            const ownListId = placement.parentId ? listId : placement.listId;
            ordered.push(this.toTask({ issue, parentId: placement.parentId, listId: ownListId }));
            for (const child of children.get(issue.id) ?? []) visit(child, ownListId);
        };
        for (const root of children.get(null) ?? []) visit(root, null);

        this.mappedTasks = ordered;
        return ordered;
    }

    private placement(issue: JiraDcIssue): JiraDcPlacement {
        const ownList = this.options.epicsAs === 'list' && this.epicIds.has(issue.id) ? issue.id : null;
        const parentId = issue.fields.parent?.id;
        const parent = parentId ? this.issues.get(parentId) : undefined;
        if (issue.fields.issuetype?.subtask && parent && parent.id !== issue.id) return { parentId: parent.id, listId: null };

        const epic = this.epicOf(issue);
        if (!epic || epic.id === issue.id) return { parentId: null, listId: ownList };
        return this.options.epicsAs === 'task' ? { parentId: epic.id, listId: null } : { parentId: null, listId: epic.id };
    }

    private toTask(args: JiraDcToTaskArgs): ImportTask {
        const { issue, parentId, listId } = args;
        const fields = issue.fields;
        const statusId = fields.status?.id && this.statusIds.has(fields.status.id) ? fields.status.id : null;
        const complete = fields.status?.statusCategory?.key === 'done';
        const assignee = this.userId(fields.assignee);
        return {
            externalId: issue.id,
            parentExternalId: parentId,
            title: this.title(issue),
            noteMarkdown: this.note(issue),
            sourceUrl: `${this.siteUrl}/browse/${encodeURIComponent(issue.key)}`,
            statusExternalId: parentId ? null : statusId,
            listExternalId: listId,
            tagExternalIds: [...new Set(fields.labels ?? [])],
            assigneeExternalIds: assignee ? [assignee] : [],
            startDate: null,
            endDate: this.dueDate(fields.duedate),
            priority: (fields.priority?.name && JIRA_DC_PRIORITIES[fields.priority.name.trim().toLowerCase()]) || null,
            complete,
            completedAt: complete ? this.date(fields.resolutiondate) : null,
            attachments: this.options.includeAttachments ? this.attachments(issue) : [],
        };
    }

    private tags(): ImportTag[] {
        const used = new Set(this.tasks().flatMap((task) => task.tagExternalIds));
        return [...used].map((name) => ({
            externalId: name,
            name: ImportMarkdown.text(name) || '—',
            color: JIRA_DC_DEFAULT_LABEL_COLOR,
        }));
    }

    private note(issue: JiraDcIssue): string | null {
        const sections: string[] = [];
        const description = JiraDcWikiMarkup.toMarkdown(issue.fields.description);
        if (description) sections.push(description);

        const comments = this.options.commentsToNote ? (this.snapshot.commentsByIssue.get(issue.id) ?? []) : [];
        const items = comments
            .map((comment) => ({ comment, text: JiraDcWikiMarkup.toMarkdown(comment.body) }))
            .filter((item) => item.text)
            .map(({ comment, text }) =>
                ImportMarkdown.comment({ authorName: comment.author?.displayName ?? comment.author?.name ?? '', date: comment.created, text: text! }),
            );
        if (items.length > 0) sections.push([`**${this.labels.comments}**`, ...items].join('\n\n'));

        return sections.length > 0 ? sections.join('\n\n') : null;
    }

    private attachments(issue: JiraDcIssue): ImportAttachment[] {
        return (issue.fields.attachment ?? [])
            .filter((attachment) => /^\d+$/.test(attachment.id) && attachment.filename)
            .map((attachment) => ({
                externalId: attachment.id,
                name: attachment.filename,
                mimeType: attachment.mimeType || 'application/octet-stream',
                sizeBytes: typeof attachment.size === 'number' ? attachment.size : null,
                downloadRef: JSON.stringify({ id: attachment.id, filename: attachment.filename }),
            }));
    }

    private epicOf(issue: JiraDcIssue): JiraDcIssue | undefined {
        const field = this.snapshot.epicFields.epicLink;
        const key = field ? issue.fields[field] : null;
        return typeof key === 'string' ? this.issuesByKey.get(key) : undefined;
    }

    private epicName(issue: JiraDcIssue): string | null {
        const field = this.snapshot.epicFields.epicName;
        const value = field ? issue.fields[field] : null;
        return typeof value === 'string' && value.trim() ? value : null;
    }

    private userId(user: JiraDcUser | null | undefined): string | null {
        return user?.key || user?.name || null;
    }

    private title(issue: JiraDcIssue): string {
        return ImportMarkdown.text(issue.fields.summary ?? '') || issue.key;
    }

    private categoryOrder(status: JiraDcStatus): number {
        return JIRA_DC_CATEGORY_ORDER[status.statusCategory?.key ?? ''] ?? JIRA_DC_CATEGORY_ORDER.indeterminate;
    }

    private date(value: string | null | undefined): Date | null {
        if (!value) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    private dueDate(value: string | null | undefined): string | null {
        const date = value?.slice(0, 10);
        return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    }
}
