import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { ImportAttachment, ImportNoteLabels, ImportStructure, ImportTag, ImportTask } from '../../core/import-provider.types';
import { JiraCloudAdf } from './JiraCloudAdf';
import {
    JIRA_CLOUD_CATEGORY_ORDER,
    JIRA_CLOUD_DEFAULT_LABEL_COLOR,
    JIRA_CLOUD_EPIC_LEVEL,
    JIRA_CLOUD_PRIORITIES,
} from './jira-cloud.constants';
import type {
    JiraCloudIssue,
    JiraCloudMapperArgs,
    JiraCloudOptions,
    JiraCloudPlacement,
    JiraCloudStatus,
    JiraCloudToTaskArgs,
} from './jira-cloud.types';

export class JiraCloudMapper {
    private readonly snapshot: JiraCloudMapperArgs['snapshot'];
    private readonly siteUrl: string;
    private readonly options: JiraCloudOptions;
    private readonly labels: ImportNoteLabels;
    private readonly statuses: JiraCloudStatus[];
    private readonly statusIds: Set<string>;
    private readonly issues: Map<string, JiraCloudIssue>;
    private mappedTasks: ImportTask[] | null = null;

    constructor(args: JiraCloudMapperArgs) {
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
    }

    structure(): ImportStructure {
        const lists =
            this.options.epicsAs === 'list'
                ? this.snapshot.issues.filter((issue) => this.isEpic(issue)).map((issue) => ({ externalId: issue.id, name: this.title(issue) }))
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
        const placements = new Map<string, JiraCloudPlacement>();
        for (const issue of this.snapshot.issues) placements.set(issue.id, this.placement(issue));

        const children = new Map<string | null, JiraCloudIssue[]>();
        for (const issue of this.snapshot.issues) {
            const parentId = placements.get(issue.id)!.parentId;
            const bucket = children.get(parentId) ?? [];
            bucket.push(issue);
            children.set(parentId, bucket);
        }

        const ordered: ImportTask[] = [];
        const visited = new Set<string>();
        const visit = (issue: JiraCloudIssue, listId: string | null) => {
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

    private placement(issue: JiraCloudIssue): JiraCloudPlacement {
        const parentId = issue.fields.parent?.id;
        const parent = parentId ? this.issues.get(parentId) : undefined;
        const ownList = this.options.epicsAs === 'list' && this.isEpic(issue) ? issue.id : null;
        if (!parent || parent.id === issue.id) return { parentId: null, listId: ownList };
        if (this.isSubtask(issue)) return { parentId: parent.id, listId: null };
        if (this.isEpic(parent)) {
            return this.options.epicsAs === 'task' ? { parentId: parent.id, listId: null } : { parentId: null, listId: parent.id };
        }
        return { parentId: null, listId: ownList };
    }

    private toTask(args: JiraCloudToTaskArgs): ImportTask {
        const { issue, parentId, listId } = args;
        const fields = issue.fields;
        const statusId = fields.status?.id && this.statusIds.has(fields.status.id) ? fields.status.id : null;
        const complete = fields.status?.statusCategory?.key === 'done';
        const completedAt = complete ? this.date(fields.resolutiondate ?? fields.statuscategorychangedate) : null;
        return {
            externalId: issue.id,
            parentExternalId: parentId,
            title: this.title(issue),
            noteMarkdown: this.note(issue),
            sourceUrl: `${this.siteUrl}/browse/${encodeURIComponent(issue.key)}`,
            statusExternalId: parentId ? null : statusId,
            listExternalId: listId,
            tagExternalIds: [...new Set(fields.labels ?? [])],
            assigneeExternalIds: fields.assignee?.accountId ? [fields.assignee.accountId] : [],
            startDate: null,
            endDate: this.dueDate(fields.duedate),
            priority: (fields.priority?.name && JIRA_CLOUD_PRIORITIES[fields.priority.name.trim().toLowerCase()]) || null,
            complete,
            completedAt,
            attachments: this.options.includeAttachments ? this.attachments(issue) : [],
        };
    }

    private tags(): ImportTag[] {
        const used = new Set(this.tasks().flatMap((task) => task.tagExternalIds));
        return [...used].map((name) => ({
            externalId: name,
            name: ImportMarkdown.text(name) || '—',
            color: JIRA_CLOUD_DEFAULT_LABEL_COLOR,
        }));
    }

    private note(issue: JiraCloudIssue): string | null {
        const sections: string[] = [];
        const description = JiraCloudAdf.toMarkdown(issue.fields.description);
        if (description) sections.push(description);

        const comments = this.options.commentsToNote ? (this.snapshot.commentsByIssue.get(issue.id) ?? []) : [];
        const items = comments
            .map((comment) => ({ comment, text: JiraCloudAdf.toMarkdown(comment.body) }))
            .filter((item) => item.text)
            .map(({ comment, text }) =>
                ImportMarkdown.comment({ authorName: comment.author?.displayName ?? '', date: comment.created, text: text! }),
            );
        if (items.length > 0) sections.push([`**${this.labels.comments}**`, ...items].join('\n\n'));

        return sections.length > 0 ? sections.join('\n\n') : null;
    }

    private attachments(issue: JiraCloudIssue): ImportAttachment[] {
        return (issue.fields.attachment ?? [])
            .filter((attachment) => /^\d+$/.test(attachment.id))
            .map((attachment) => ({
                externalId: attachment.id,
                name: attachment.filename || attachment.id,
                mimeType: attachment.mimeType || 'application/octet-stream',
                sizeBytes: typeof attachment.size === 'number' ? attachment.size : null,
                downloadRef: JSON.stringify({ id: attachment.id }),
            }));
    }

    private title(issue: JiraCloudIssue): string {
        return ImportMarkdown.text(issue.fields.summary ?? '') || issue.key;
    }

    private isEpic(issue: JiraCloudIssue): boolean {
        return issue.fields.issuetype?.hierarchyLevel === JIRA_CLOUD_EPIC_LEVEL;
    }

    private isSubtask(issue: JiraCloudIssue): boolean {
        return Boolean(issue.fields.issuetype?.subtask) || (issue.fields.issuetype?.hierarchyLevel ?? 0) < 0;
    }

    private categoryOrder(status: JiraCloudStatus): number {
        return JIRA_CLOUD_CATEGORY_ORDER[status.statusCategory?.key ?? ''] ?? JIRA_CLOUD_CATEGORY_ORDER.indeterminate;
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
