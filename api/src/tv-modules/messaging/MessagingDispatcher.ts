import { eq } from 'drizzle-orm';
import { SprintsSchema, TasksSchema } from 'taskview-db-schemas';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { getJobQueue } from '../../core/JobQueue';
import { Database } from '../../modules/db';
import { decrypt } from '../../utils/crypto';
import { $logger } from '../../modules/logget';
import { GoalPermissionsRepository } from '../../core/GoalPermissionsRepository';
import { GoalPermissionsChecker } from '../../core/GoalPermissionsChecker';
import { GoalPermissions } from '../../types/auth.types';
import { MessagingRepository } from './MessagingRepository';
import { MessagingManager } from './MessagingManager';
import { buildMessagingMessage } from './messages';
import { buildTaskDeepLink } from './utils';
import type { Dispatcher } from '../../core/Dispatcher';
import type { MessagingConnectionsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { MessagingDeliverJobData, MessagingEvent, MessagingProviderId } from './types';
import type { MessagingDispatchArgs, MessagingRecipient, MessagingTaskContext } from './types.internal';

const MESSAGING_DELIVER_JOB = 'messaging-deliver';
const MAX_ATTEMPTS = 3;

export class MessagingDispatcher implements Dispatcher {
    private readonly repository = new MessagingRepository();
    private readonly manager = new MessagingManager();
    private readonly permissionsRepo = new GoalPermissionsRepository();

    register(): void {
        eventBus.on('task.created', (data) => this.onTaskCreated(data));
        eventBus.on('task.assigneesChanged', (data) => this.onTaskAssigned(data));
        eventBus.on('task.updated', (data) => this.onTaskUpdated(data));
        eventBus.on('task.assignedToSprint', (data) => this.onTaskAddedToSprint(data));
        eventBus.on('task.deleted', (data) => this.onTaskDeleted(data));

        eventBus.on('sprint.created', (data) => this.onSprintObj('sprint.created', data));
        eventBus.on('sprint.updated', (data) => this.onSprintObj('sprint.updated', data));
        eventBus.on('sprint.activated', (data) => this.onSprint('sprint.started', data));
        eventBus.on('sprint.reviewStarted', (data) => this.onSprint('sprint.reviewStarted', data));
        eventBus.on('sprint.completed', (data) => this.onSprint('sprint.completed', data));
        eventBus.on('sprint.paused', (data) => this.onSprint('sprint.paused', data));
        eventBus.on('sprint.resumed', (data) => this.onSprint('sprint.resumed', data));
        eventBus.on('sprint.deleted', (data) => this.onSprint('sprint.deleted', data));

        eventBus.on('collaboration.userAdded', (data) => this.onMember('member.added', data.goalId, data.email, data.initiatorId));
        eventBus.on('collaboration.userRemoved', (data) => this.onMemberByCollab('member.removed', data.goalId, data.collaborationUserId, data.initiatorId));
        eventBus.on('collaboration.rolesChanged', (data) => this.onMemberByCollab('member.rolesChanged', data.goalId, data.collaborationUserId, data.initiatorId));

        eventBus.on('time-entry.started', (data) => this.onTimeEntry('time.started', data.goalId, data.taskId, data.userId));
        eventBus.on('time-entry.stopped', (data) => this.onTimeEntry('time.stopped', data.goalId, data.taskId, data.userId));
        eventBus.on('time-entry.created', (data) => this.onTimeEntry('time.logged', data.entry.goalId, data.entry.taskId, data.initiatorId));
        eventBus.on('time-entry.updated', (data) => this.onTimeEntry('time.updated', data.entry.goalId, data.entry.taskId, data.initiatorId));
        eventBus.on('time-entry.deleted', (data) => this.onTimeEntry('time.deleted', data.goalId, data.taskId, data.initiatorId));

        eventBus.on('recurrence.created', (data) => this.onRecurrence('recurrence.created', data.rule.goalId, data.initiatorId));
        eventBus.on('recurrence.updated', (data) => this.onRecurrence('recurrence.updated', data.rule.goalId, data.initiatorId));
        eventBus.on('recurrence.paused', (data) => this.onRecurrence('recurrence.paused', data.goalId, data.initiatorId));
        eventBus.on('recurrence.resumed', (data) => this.onRecurrence('recurrence.resumed', data.goalId, data.initiatorId));
        eventBus.on('recurrence.ended', (data) => this.onRecurrence('recurrence.ended', data.goalId, data.initiatorId));
        eventBus.on('recurrence.deleted', (data) => this.onRecurrence('recurrence.deleted', data.goalId, data.initiatorId));
        eventBus.on('recurrence.instanceSkipped', (data) => this.onRecurrence('recurrence.skipped', data.goalId, data.initiatorId));
    }

    async registerWorkers(): Promise<void> {
        const boss = getJobQueue();
        await boss.createQueue(MESSAGING_DELIVER_JOB);
        await boss.work<MessagingDeliverJobData>(MESSAGING_DELIVER_JOB, async ([job]) => {
            await this.deliverJob(job.data);
        });
    }

    private async onTaskCreated(data: AppEvents['task.created']): Promise<void> {
        // A brand-new task usually has no assignees yet, so target project members.
        const recipients = await this.repository.fetchProjectMemberRecipients(data.task.goalId);
        await this.dispatch({
            event: 'task.created',
            goalId: data.task.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            task: this.taskCtx(data.task)
        });
    }

    private async onTaskAssigned(data: AppEvents['task.assigneesChanged']): Promise<void> {
        if (data.userIds.length === 0) return;
        const task = await this.fetchTask(data.taskId);
        if (!task) return;

        // Keep only collab ids still assigned AND still project members, then resolve to auth recipients.
        const currentAssignees = new Set(await this.repository.fetchCurrentAssigneeCollabIds(task.id));
        const stillAssigned = data.userIds.filter(id => currentAssignees.has(id));
        const memberCollabIds = await this.repository.filterCollabIdsInGoal(stillAssigned, task.goalId);
        if (memberCollabIds.length === 0) return;
        const recipients = await this.repository.resolveCollabIdsToRecipients(memberCollabIds);

        await this.dispatch({
            event: 'task.assigned',
            goalId: task.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            task: this.taskCtx(task)
        });
    }

    private async onTaskUpdated(data: AppEvents['task.updated']): Promise<void> {
        const changes = data.changes ?? {};
        let event: MessagingEvent;
        let titleOverride: string | undefined;
        if ('complete' in changes && data.task.complete === true) event = 'task.completed';
        else if ('complete' in changes && data.task.complete === false) {
            // Reopen: gated by the same task.completed subscription, but shown as "reopened".
            event = 'task.completed';
            titleOverride = '[Task reopened]';
        } else if ('statusId' in changes) event = 'task.statusChanged';
        else event = 'task.edited';

        const recipients = await this.taskAssigneeRecipients(data.task.id, data.task.goalId);
        await this.dispatch({
            event,
            goalId: data.task.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            task: this.taskCtx(data.task),
            titleOverride
        });
    }

    private async onTaskAddedToSprint(data: AppEvents['task.assignedToSprint']): Promise<void> {
        if (!data.sprintId) return;
        const task = await this.fetchTask(data.taskId);
        if (!task) return;
        const recipients = await this.taskAssigneeRecipients(data.taskId, data.goalId);
        await this.dispatch({
            event: 'task.addedToSprint',
            goalId: data.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            task: this.taskCtx(task)
        });
    }

    private async onTaskDeleted(data: AppEvents['task.deleted']): Promise<void> {
        const recipients = await this.repository.fetchProjectMemberRecipients(data.goalId);
        await this.dispatch({
            event: 'task.deleted',
            goalId: data.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            body: `#${data.taskId}`
        });
    }

    private async onSprintObj(event: MessagingEvent, data: { sprint: { goalId: number; name: string }; initiatorId: number }): Promise<void> {
        const recipients = await this.repository.fetchProjectMemberRecipients(data.sprint.goalId);
        await this.dispatch({
            event,
            goalId: data.sprint.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            body: data.sprint.name
        });
    }

    private async onSprint(event: MessagingEvent, data: { sprintId: number; goalId: number; initiatorId: number | null }): Promise<void> {
        const name = await this.fetchSprintName(data.sprintId);
        const recipients = await this.repository.fetchProjectMemberRecipients(data.goalId);
        await this.dispatch({
            event,
            goalId: data.goalId,
            personalRecipients: recipients,
            initiatorId: data.initiatorId,
            body: name
        });
    }

    private async onMember(event: MessagingEvent, goalId: number, body: string, initiatorId: number): Promise<void> {
        const recipients = await this.repository.fetchProjectMemberRecipients(goalId);
        await this.dispatch({
            event,
            goalId,
            personalRecipients: recipients,
            initiatorId,
            body
        });
    }

    private async onMemberByCollab(event: MessagingEvent, goalId: number, collabId: number, initiatorId: number): Promise<void> {
        const email = await this.repository.fetchCollabEmail(collabId);
        await this.onMember(event, goalId, email ?? '', initiatorId);
    }

    private async onTimeEntry(event: MessagingEvent, goalId: number, taskId: number, initiatorId: number | null): Promise<void> {
        const task = await this.fetchTask(taskId);
        const recipients = await this.repository.fetchProjectMemberRecipients(goalId);
        // Time entries reference a task → gate the task description like task events.
        await this.dispatch({
            event,
            goalId,
            personalRecipients: recipients,
            initiatorId,
            task: task ? this.taskCtx(task) : undefined,
            body: task ? undefined : `#${taskId}`
        });
    }

    private async onRecurrence(event: MessagingEvent, goalId: number, initiatorId: number): Promise<void> {
        // Recurring-rule template content is not shown (avoids leaking gated task content); title only.
        const recipients = await this.repository.fetchProjectMemberRecipients(goalId);
        await this.dispatch({ event, goalId, personalRecipients: recipients, initiatorId, body: '' });
    }

    private async dispatch(args: MessagingDispatchArgs): Promise<void> {
        // No initiator exclusion: messaging is an explicit opt-in feed — if you
        // subscribed to an event you receive it, even for your own actions.
        const url = args.task ? await this.buildTaskUrl(args.goalId, args.task.id, args.task.goalListId) : undefined;
        const projectName = await this.repository.fetchGoalName(args.goalId);
        // Assignee emails are RBAC-gated content. Compute once, then include per recipient
        // only when they may see assignees (TASKS_CAN_WATCH_ASSIGNED_USERS) — same treatment
        // as the description, which is gated by COMPONENT_CAN_WATCH_CONTENT.
        const footerText = args.task ? await this.assigneesFooter(args.task.id) : undefined;

        let personalCount = 0;
        for (const r of args.personalRecipients) {
            const checker = args.task ? await this.checkerForRecipient(args.goalId, r) : null;
            const body = this.bodyForRecipient(args, checker);
            const footer = footerText && checker?.hasPermissions(GoalPermissions.TASKS_CAN_WATCH_ASSIGNED_USERS) ? footerText : undefined;
            const message = buildMessagingMessage({
                event: args.event,
                audience: 'personal',
                body,
                url,
                taskId: args.task?.id,
                projectName,
                footer,
                completed: args.task?.complete,
                titleOverride: args.titleOverride
            });
            const connections = await this.subscribed('user', r.userId, args.event);
            personalCount += connections.length;
            await this.enqueueAll(connections, message);
        }

        // Project channel: a shared channel's membership doesn't map to TaskView content
        // permission. By default the description AND assignees ARE posted (a channel is a
        // deliberate broadcast); a connection can opt out via post_content — then task events
        // get title + link only (no description, no assignee emails). Non-task bodies
        // (sprint name, …) are not RBAC-gated content.
        const projectConnections = await this.subscribed('project', args.goalId, args.event);
        for (const connection of projectConnections) {
            const projectBody = args.task
                ? (connection.postContent ? (args.task.description ?? `#${args.task.id}`) : '')
                : (args.body ?? '');
            const projectFooter = connection.postContent ? footerText : undefined;
            // A content-hidden channel gets title + link only — no description, no assignee footer,
            // and no action buttons (their modals would expose members / task state).
            const projectMessage = buildMessagingMessage({
                event: args.event,
                audience: 'project',
                body: projectBody,
                url,
                taskId: args.task?.id,
                projectName,
                footer: projectFooter,
                completed: args.task?.complete,
                titleOverride: args.titleOverride,
                actions: connection.postContent
            });
            await this.enqueueAll([connection], projectMessage);
        }

        $logger.info(
            { event: args.event, goalId: args.goalId, members: args.personalRecipients.length, personalConns: personalCount, projectConns: projectConnections.length },
            '[Messaging] dispatch',
        );
    }

    private bodyForRecipient(args: MessagingDispatchArgs, checker: GoalPermissionsChecker | null): string {
        if (!args.task) return args.body ?? '';
        const canWatch = checker?.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT) ?? false;
        return canWatch ? (args.task.description ?? `#${args.task.id}`) : `#${args.task.id}`;
    }

    /** Per-recipient permission checker for the goal; fail-closed (empty) on lookup error. */
    private async checkerForRecipient(goalId: number, recipient: MessagingRecipient): Promise<GoalPermissionsChecker> {
        const permissions = await this.permissionsRepo
            .fetchPermissionsForGoalByUser({ goalId, userId: recipient.userId, email: recipient.email })
            .catch((err) => {
                $logger.error(err, `[Messaging] permission check failed for user=${recipient.userId}`);
                return [];
            });
        return new GoalPermissionsChecker(permissions);
    }

    private async buildTaskUrl(goalId: number, taskId: number, goalListId: number | null): Promise<string | undefined> {
        const orgSlug = await this.repository.fetchGoalOrgSlug(goalId);
        return buildTaskDeepLink(orgSlug, goalId, taskId, goalListId);
    }

    /** "👤 email1, email2" of the task's current assignees, or undefined if none. */
    private async assigneesFooter(taskId: number): Promise<string | undefined> {
        const collabIds = await this.repository.fetchCurrentAssigneeCollabIds(taskId);
        if (collabIds.length === 0) return undefined;
        const assignees = await this.repository.resolveCollabIdsToRecipients(collabIds);
        if (assignees.length === 0) return undefined;
        return `👤 ${assignees.map((a) => a.email).join(', ')}`;
    }

    private async subscribed(ownerType: string, ownerId: number, event: MessagingEvent): Promise<MessagingConnectionsSchemaTypeForSelect[]> {
        const connections = await this.repository.fetchActiveByOwner(ownerType, ownerId);
        return connections.filter(c => c.events.includes(event));
    }

    private async taskAssigneeRecipients(taskId: number, goalId: number): Promise<MessagingRecipient[]> {
        const collabIds = await this.repository.fetchCurrentAssigneeCollabIds(taskId);
        const memberCollabIds = await this.repository.filterCollabIdsInGoal(collabIds, goalId);
        return this.repository.resolveCollabIdsToRecipients(memberCollabIds);
    }

    private taskCtx(task: { id: number; goalListId: number | null; description: string | null; complete: boolean | null }): MessagingTaskContext {
        return { id: task.id, goalListId: task.goalListId, description: task.description, complete: task.complete === true };
    }

    private async fetchTask(taskId: number) {
        const db = Database.getInstance();
        const rows = await db.dbDrizzle.select().from(TasksSchema).where(eq(TasksSchema.id, taskId)).limit(1);
        return rows[0] ?? null;
    }

    private async fetchSprintName(sprintId: number): Promise<string> {
        const db = Database.getInstance();
        const rows = await db.dbDrizzle.select({ name: SprintsSchema.name }).from(SprintsSchema).where(eq(SprintsSchema.id, sprintId)).limit(1);
        return rows[0]?.name ?? `#${sprintId}`;
    }

    private async enqueueAll(connections: MessagingConnectionsSchemaTypeForSelect[], message: ReturnType<typeof buildMessagingMessage>): Promise<void> {
        const boss = getJobQueue();
        for (const connection of connections) {
            await boss.send(MESSAGING_DELIVER_JOB, {
                connectionId: connection.id,
                provider: connection.provider as MessagingProviderId,
                chatId: connection.targetChatId,
                accessTokenEncrypted: connection.accessTokenEncrypted,
                message,
                attempt: 1,
            } satisfies MessagingDeliverJobData);
        }
    }

    private async deliverJob(data: MessagingDeliverJobData): Promise<void> {
        const provider = this.manager.getProvider(data.provider);
        if (!provider || !provider.isConfigured()) return;

        const result = await provider.deliver({
            chatId: data.chatId,
            accessToken: data.accessTokenEncrypted ? decrypt(data.accessTokenEncrypted) : null,
            message: data.message,
        });

        $logger.info({ connectionId: data.connectionId, provider: data.provider, success: result.success, errorCode: result.errorCode }, '[Messaging] deliver result');

        if (result.success) return;

        if (data.attempt < MAX_ATTEMPTS) {
            const boss = getJobQueue();
            const delay = Math.pow(2, data.attempt) * 5;
            await boss.send(MESSAGING_DELIVER_JOB, { ...data, attempt: data.attempt + 1 }, { startAfter: delay });
            return;
        }

        $logger.warn(`[Messaging] Delivery failed for connection=${data.connectionId} after ${MAX_ATTEMPTS} attempts`);
    }
}
