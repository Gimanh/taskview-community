import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { ImportAttachment, ImportNoteLabels, ImportStructure, ImportTask, ImportTag } from '../../core/import-provider.types';
import {
    TODOIST_COLORS,
    TODOIST_DEFAULT_LABEL_COLOR,
    TODOIST_FILES_HOST,
    TODOIST_PRIORITIES,
    TODOIST_WEB_HOST,
} from './todoist.constants';
import type { TodoistComment, TodoistMapperArgs, TodoistOptions, TodoistSection, TodoistTask } from './todoist.types';

export class TodoistMapper {
    private readonly snapshot: TodoistMapperArgs['snapshot'];
    private readonly options: TodoistOptions;
    private readonly labels: ImportNoteLabels;
    private readonly sections: TodoistSection[];
    private readonly sectionIds: Set<string>;
    private readonly peopleNames: Map<string, string>;
    private mappedTasks: ImportTask[] | null = null;

    constructor(args: TodoistMapperArgs) {
        this.snapshot = args.snapshot;
        this.options = args.options;
        this.labels = ImportMarkdown.labels(args.locale);
        this.sections = args.snapshot.sections
            .filter((section) => !section.is_deleted && !section.is_archived)
            .sort((a, b) => a.section_order - b.section_order);
        this.sectionIds = new Set(this.sections.map((section) => section.id));
        this.peopleNames = new Map(args.snapshot.people.map((person) => [person.id, person.name || person.email || '']));
    }

    structure(): ImportStructure {
        const containers = this.sections.map((section) => ({
            externalId: section.id,
            name: ImportMarkdown.text(section.name) || '—',
        }));
        return {
            projectName: ImportMarkdown.text(this.snapshot.project.name) || 'Todoist',
            projectDescription: this.snapshot.project.description?.trim() || null,
            statuses: this.options.sectionsAs === 'status' ? containers : [],
            lists: this.options.sectionsAs === 'list' ? containers : [],
            tags: this.tags(),
            taskCount: this.tasks().length,
        };
    }

    tasks(): ImportTask[] {
        if (this.mappedTasks) return this.mappedTasks;
        const byId = new Map(this.snapshot.tasks.map((task) => [task.id, task]));
        const children = new Map<string | null, TodoistTask[]>();
        for (const task of this.snapshot.tasks) {
            const parentId = task.parent_id && byId.has(task.parent_id) ? task.parent_id : null;
            const bucket = children.get(parentId) ?? [];
            bucket.push(task);
            children.set(parentId, bucket);
        }

        const roots = this.sortRoots(children.get(null) ?? []);
        const ordered: ImportTask[] = [];
        const visit = (task: TodoistTask, parentId: string | null) => {
            ordered.push(this.toTask(task, parentId));
            const nested = [...(children.get(task.id) ?? [])].sort((a, b) => a.child_order - b.child_order);
            for (const child of nested) visit(child, task.id);
        };
        for (const root of roots) visit(root, null);

        this.mappedTasks = ordered;
        return ordered;
    }

    private sortRoots(tasks: TodoistTask[]): TodoistTask[] {
        const sectionOrder = new Map(this.sections.map((section, index) => [section.id, index]));
        const position = (task: TodoistTask) => (task.section_id ? sectionOrder.get(task.section_id) ?? -1 : -1);
        return [...tasks].sort((a, b) => position(a) - position(b) || a.child_order - b.child_order);
    }

    private toTask(task: TodoistTask, parentId: string | null): ImportTask {
        const sectionId = task.section_id && this.sectionIds.has(task.section_id) ? task.section_id : null;
        const complete = Boolean(task.checked);
        return {
            externalId: task.id,
            parentExternalId: parentId,
            title: ImportMarkdown.text(task.content) || task.id,
            noteMarkdown: this.note(task),
            sourceUrl: `https://${TODOIST_WEB_HOST}/app/task/${encodeURIComponent(task.id)}`,
            statusExternalId: this.options.sectionsAs === 'status' && !parentId ? sectionId : null,
            listExternalId: this.options.sectionsAs === 'list' ? sectionId : null,
            tagExternalIds: [...new Set(task.labels ?? [])],
            assigneeExternalIds: task.responsible_uid ? [task.responsible_uid] : [],
            startDate: null,
            endDate: this.dueDate(task),
            priority: TODOIST_PRIORITIES[task.priority] ?? null,
            complete,
            completedAt: complete && task.completed_at ? new Date(task.completed_at) : null,
            attachments: this.options.includeAttachments ? this.attachments(task) : [],
        };
    }

    private tags(): ImportTag[] {
        const used = new Set(this.tasks().flatMap((task) => task.tagExternalIds));
        const colors = new Map(this.snapshot.labels.map((label) => [label.name, label.color]));
        return [...used].map((name) => {
            const color = colors.get(name);
            return {
                externalId: name,
                name: ImportMarkdown.text(name) || '—',
                color: (color && TODOIST_COLORS[color]) || TODOIST_DEFAULT_LABEL_COLOR,
            };
        });
    }

    private note(task: TodoistTask): string | null {
        const sections: string[] = [];
        const description = task.description?.trim();
        if (description) sections.push(description);

        if (task.due?.is_recurring && task.due.string) {
            sections.push(`**${this.labels.recurring}:** ${ImportMarkdown.inline(task.due.string)}`);
        }

        const comments = this.comments(task.id);
        const links = comments
            .map((comment) => comment.file_attachment)
            .filter((file) => file?.file_url && !this.isTodoistFile(file.file_url) && ImportMarkdown.httpUrl(file.file_url));
        if (links.length > 0) {
            const items = links.map((file) => `- [${ImportMarkdown.inline(file!.file_name || file!.file_url!)}](${ImportMarkdown.linkTarget(file!.file_url!)})`);
            sections.push([`**${this.labels.attachments}**`, ...items].join('\n'));
        }

        const notes = this.options.commentsToNote ? comments.filter((comment) => comment.content?.trim()) : [];
        if (notes.length > 0) {
            const items = notes.map((comment) =>
                ImportMarkdown.comment({
                    authorName: (comment.posted_uid && this.peopleNames.get(comment.posted_uid)) || '',
                    date: comment.posted_at,
                    text: comment.content!.trim(),
                }),
            );
            sections.push([`**${this.labels.comments}**`, ...items].join('\n\n'));
        }

        return sections.length > 0 ? sections.join('\n\n') : null;
    }

    private attachments(task: TodoistTask): ImportAttachment[] {
        return this.comments(task.id)
            .filter((comment) => this.isTodoistFile(comment.file_attachment?.file_url))
            .map((comment) => {
                const file = comment.file_attachment!;
                const name = file.file_name || comment.id;
                return {
                    externalId: comment.id,
                    name,
                    mimeType: file.file_type || 'application/octet-stream',
                    sizeBytes: typeof file.file_size === 'number' ? file.file_size : null,
                    downloadRef: JSON.stringify({ url: file.file_url }),
                };
            });
    }

    private comments(taskId: string): TodoistComment[] {
        return this.snapshot.commentsByTask.get(taskId) ?? [];
    }

    private isTodoistFile(url: string | null | undefined): boolean {
        return ImportMarkdown.httpsUrlOnHost(url, TODOIST_FILES_HOST);
    }

    private dueDate(task: TodoistTask): string | null {
        const date = task.due?.date?.slice(0, 10);
        return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
    }
}
