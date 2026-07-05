import { AppUser } from '../../core/AppUser';
import { GoalPermissions } from '../../types/auth.types';
import { decrypt } from '../../utils/crypto';
import { MessagingRepository } from './MessagingRepository';
import { SlackProvider } from './providers/slack.provider';
import {
    SLACK_ACTION_ASSIGN,
    SLACK_ACTION_DONE,
    SLACK_ACTION_REOPEN,
    SLACK_ASSIGN_BLOCK,
    SLACK_ASSIGN_SELECT_ACTION,
    SLACK_VIEW_ASSIGN_CALLBACK,
} from './providers/slack.constants';
import { buildTaskDeepLink, escapeSlackText } from './utils';
import type { SlackEphemeralReply, SlackInteractionPayload, SlackSlashCommandPayload } from './types.internal';

// Orchestrates inbound Slack actions: /task (create), and Done / Assign buttons.
// Every path resolves the Slack user to a TaskView user (identity map) and enforces
// that user's RBAC before touching anything.
export class SlackInboundManager {
    private readonly repository = new MessagingRepository();
    private readonly slack = new SlackProvider();

    async handleSlashCommand(payload: SlackSlashCommandPayload): Promise<SlackEphemeralReply> {
        const userId = await this.resolveUser(payload.user_id, payload.team_id);
        if (!userId) return this.ephemeral(this.linkPrompt());

        const description = (payload.text ?? '').trim();
        if (!description) return this.ephemeral('Usage: /task <description>');

        const goalIds = await this.repository.fetchProjectGoalIdsByChannel({ provider: 'slack', channelId: payload.channel_id ?? '', externalTeamId: payload.team_id ?? null });
        if (goalIds.length === 0) return this.ephemeral('This channel is not linked to a TaskView project.');
        if (goalIds.length > 1) return this.ephemeral('This channel is linked to several projects — create the task in TaskView.');

        const appUser = await this.buildAppUser(userId);
        if (!appUser) return this.ephemeral('Could not resolve your TaskView account.');

        const checker = await appUser.permissionsFetcher.getCheckerForGoal(goalIds[0]);
        if (!checker.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS)) {
            return this.ephemeral('You do not have permission to create tasks in this project.');
        }

        const created = await appUser.tasksManager.addTaskNew({ goalId: goalIds[0], description });
        if (!created?.[0]) return this.ephemeral('Failed to create the task.');
        return this.ephemeral(`✅ Task created: ${description}`);
    }

    async handleInteraction(interaction: SlackInteractionPayload): Promise<object | void> {
        if (interaction.type === 'view_submission') return this.handleAssignSubmit(interaction);
        if (interaction.type === 'block_actions') return this.handleBlockAction(interaction);
    }

    private async handleBlockAction(i: SlackInteractionPayload): Promise<void> {
        const action = i.actions?.[0];
        const taskId = Number(action?.value);
        if (!action?.action_id || !taskId) return;

        const userId = await this.resolveUser(i.user?.id, i.team?.id);
        if (!userId) return this.ackEphemeral(i.response_url, this.linkPrompt());

        if (action.action_id === SLACK_ACTION_DONE) return this.completeTask(i, userId, taskId);
        if (action.action_id === SLACK_ACTION_REOPEN) return this.reopenTask(i, userId, taskId);
        if (action.action_id === SLACK_ACTION_ASSIGN) return this.openAssignModal(i, userId, taskId);
    }

    private async completeTask(i: SlackInteractionPayload, userId: number, taskId: number): Promise<void> {
        const appUser = await this.buildAppUser(userId);
        if (!appUser) return;
        const task = await appUser.tasksManager.fetchTaskById({ taskId });
        // Same reply as permission-denied below, so this can't be used to probe which task IDs exist.
        if (!task) return this.ackEphemeral(i.response_url, "You don't have access to this task.");

        const checker = await appUser.permissionsFetcher.getCheckerForGoal(task.goalId);
        if (!checker.hasPermissions(GoalPermissions.TASKS_CAN_EDIT_STATUS)) {
            return this.ackEphemeral(i.response_url, "You don't have access to this task.");
        }

        await appUser.tasksManager.updateTask({ id: taskId, complete: true });
        // Show which task (description gated by content permission, like notifications) + a link.
        const label = checker.hasPermissions(GoalPermissions.COMPONENT_CAN_WATCH_CONTENT) && task.description
            ? task.description.slice(0, 200)
            : `#${taskId}`;
        const orgSlug = await this.repository.fetchGoalOrgSlug(task.goalId);
        const url = buildTaskDeepLink(orgSlug, task.goalId, taskId, task.goalListId ?? null);
        const text = url ? `✅ Task completed: <${url}|${escapeSlackText(label)}>` : `✅ Task completed: ${escapeSlackText(label)}`;
        await this.ackEphemeral(i.response_url, text);
    }

    private async reopenTask(i: SlackInteractionPayload, userId: number, taskId: number): Promise<void> {
        const appUser = await this.buildAppUser(userId);
        if (!appUser) return;
        const task = await appUser.tasksManager.fetchTaskById({ taskId });
        // Same reply as permission-denied below, so this can't be used to probe which task IDs exist.
        if (!task) return this.ackEphemeral(i.response_url, "You don't have access to this task.");

        const checker = await appUser.permissionsFetcher.getCheckerForGoal(task.goalId);
        if (!checker.hasPermissions(GoalPermissions.TASKS_CAN_EDIT_STATUS)) {
            return this.ackEphemeral(i.response_url, "You don't have access to this task.");
        }

        await appUser.tasksManager.updateTask({ id: taskId, complete: false });
        await this.ackEphemeral(i.response_url, '↩️ Task reopened');
    }

    private async openAssignModal(i: SlackInteractionPayload, userId: number, taskId: number): Promise<void> {
        const appUser = await this.buildAppUser(userId);
        if (!appUser) return;
        const task = await appUser.tasksManager.fetchTaskById({ taskId });
        // Same reply as permission-denied below, so this can't be used to probe which task IDs exist.
        if (!task) return this.ackEphemeral(i.response_url, "You don't have access to this task.");

        const checker = await appUser.permissionsFetcher.getCheckerForGoal(task.goalId);
        if (!checker.hasPermissions(GoalPermissions.TASKS_CAN_ASSIGN_USERS)) {
            return this.ackEphemeral(i.response_url, "You don't have access to this task.");
        }

        const members = await this.repository.fetchGoalCollabMembers(task.goalId);
        if (members.length === 0) return this.ackEphemeral(i.response_url, 'This project has no members to assign.');

        const botToken = await this.botTokenForTeam(i.team?.id);
        if (!botToken || !i.trigger_id) return this.ackEphemeral(i.response_url, 'Slack workspace is not fully connected.');

        // Pre-select the current assignees so the modal shows who's assigned and lets the
        // user add or remove — submit sets the whole list.
        const currentAssignees = await this.repository.fetchCurrentAssigneeCollabIds(taskId);
        const metadata = JSON.stringify({ taskId });
        await this.slack.openModal({ botToken, triggerId: i.trigger_id, view: this.assignView(members, currentAssignees, metadata) });
    }

    private async handleAssignSubmit(i: SlackInteractionPayload): Promise<object> {
        if (i.view?.callback_id !== SLACK_VIEW_ASSIGN_CALLBACK) return {};
        const meta = this.parseMeta(i.view.private_metadata);
        const taskId = Number(meta.taskId);
        if (!taskId) return {};

        const selected = i.view.state?.values?.[SLACK_ASSIGN_BLOCK]?.[SLACK_ASSIGN_SELECT_ACTION]?.selected_options ?? [];
        const selectedCollabIds = selected.map((o) => Number(o.value)).filter((n) => Number.isInteger(n) && n > 0);

        const userId = await this.resolveUser(i.user?.id, i.team?.id);
        if (!userId) return this.viewError(this.linkPrompt());
        const appUser = await this.buildAppUser(userId);
        if (!appUser) return {};

        const task = await appUser.tasksManager.fetchTaskById({ taskId });
        if (!task) return {};
        const checker = await appUser.permissionsFetcher.getCheckerForGoal(task.goalId);
        if (!checker.hasPermissions(GoalPermissions.TASKS_CAN_ASSIGN_USERS)) {
            return this.viewError('You do not have permission to assign this task.');
        }

        // toggleTaskUsers is called directly (not via the HTTP CanUpdateTaskAssignee guard),
        // so re-validate every selected id is a member of this goal — Slack doesn't guarantee
        // the submitted values are among the options we offered.
        const valid = await this.repository.filterCollabIdsInGoal(selectedCollabIds, task.goalId);
        if (valid.length !== selectedCollabIds.length) return this.viewError('One of the selected users is not a member of this project.');

        // SET the assignee list to exactly the selection — this both adds and removes.
        // An empty selection clears everyone (the input block is optional).
        await appUser.tasksManager.toggleTaskUsers({ taskId, userIds: selectedCollabIds });
        return {}; // closes the modal
    }

    private async resolveUser(slackUserId?: string, teamId?: string): Promise<number | null> {
        if (!slackUserId) return null;
        // Scope by workspace: a Slack user id is unique only within its team.
        return this.repository.findUserIdByExternalId({ provider: 'slack', externalUserId: slackUserId, externalTeamId: teamId ?? null });
    }

    private async buildAppUser(userId: number): Promise<AppUser | null> {
        const record = await new AppUser().authManager.repository.fetchUserById(userId);
        if (!record || record.block !== 0) return null;
        return new AppUser({ id: 0, userData: { id: record.id, login: record.login, email: record.email } });
    }

    private async botTokenForTeam(teamId?: string): Promise<string | null> {
        if (!teamId) return null;
        const encrypted = await this.repository.fetchSlackBotTokenEncrypted(teamId);
        if (!encrypted) return null;
        try {
            return decrypt(encrypted);
        } catch {
            return null;
        }
    }

    private assignView(members: { collabId: number; email: string }[], currentAssignees: number[], privateMetadata: string): object {
        const current = new Set(currentAssignees);
        const options = members.slice(0, 100).map((m) => ({
            text: { type: 'plain_text', text: m.email.slice(0, 75) },
            value: String(m.collabId),
        }));
        const initialOptions = options.filter((o) => current.has(Number(o.value)));

        const element: Record<string, unknown> = {
            type: 'multi_static_select',
            action_id: SLACK_ASSIGN_SELECT_ACTION,
            placeholder: { type: 'plain_text', text: 'Select assignees' },
            options,
        };
        // Slack rejects an empty initial_options array — only set it when there are current ones.
        if (initialOptions.length > 0) element.initial_options = initialOptions;

        return {
            type: 'modal',
            callback_id: SLACK_VIEW_ASSIGN_CALLBACK,
            private_metadata: privateMetadata,
            title: { type: 'plain_text', text: 'Assignees' },
            submit: { type: 'plain_text', text: 'Save' },
            close: { type: 'plain_text', text: 'Cancel' },
            blocks: [
                {
                    type: 'input',
                    block_id: SLACK_ASSIGN_BLOCK,
                    optional: true, // allow clearing everyone
                    label: { type: 'plain_text', text: 'Assignees' },
                    element,
                },
            ],
        };
    }

    private parseMeta(raw?: string): { taskId?: number } {
        try {
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    private viewError(message: string): object {
        return { response_action: 'errors', errors: { [SLACK_ASSIGN_BLOCK]: message } };
    }

    private async ackEphemeral(responseUrl: string | undefined, text: string): Promise<void> {
        if (responseUrl) await this.slack.respondEphemeral(responseUrl, text);
    }

    private ephemeral(text: string): SlackEphemeralReply {
        return { response_type: 'ephemeral', text };
    }

    private linkPrompt(): string {
        return `Link your Slack account in TaskView first: ${process.env.APP_URL ?? ''}`;
    }
}
