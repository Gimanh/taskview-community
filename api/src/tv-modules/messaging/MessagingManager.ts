import { AppUser } from '../../core/AppUser';
import { GoalPermissions } from '../../types/auth.types';
import { $logger } from '../../modules/logget';
import { MessagingRepository } from './MessagingRepository';
import { TelegramProvider } from './providers/telegram.provider';
import { SlackProvider } from './providers/slack.provider';
import { buildTaskDeepLink } from './utils';
import type { MessagingProvider } from './providers/MessagingProvider';
import type { ConnectContext, ConnectStart, InboundIntent, InboundRaw, MessagingConnectionForClient, MessagingConnectLinkResult } from './types.internal';
import { sanitizeMessagingEvents, type MessagingMessage, type MessagingProviderId } from './types';
import type { MessagingConnectionsSchemaTypeForSelect } from 'taskview-db-schemas';

export class MessagingManager {
    public readonly repository = new MessagingRepository();
    private readonly telegram = new TelegramProvider();
    private readonly slack = new SlackProvider();
    private readonly providers: Map<MessagingProviderId, MessagingProvider>;

    constructor() {
        this.providers = new Map<MessagingProviderId, MessagingProvider>([
            ['telegram', this.telegram],
            ['slack', this.slack],
        ]);
    }

    getProvider(id: MessagingProviderId): MessagingProvider | undefined {
        return this.providers.get(id);
    }

    private async beginConnect(id: MessagingProviderId, ctx: ConnectContext): Promise<ConnectStart | null> {
        const provider = this.getProvider(id);
        if (!provider?.isConfigured()) return null;
        const start = await provider.startConnect(ctx);
        if (start.kind === 'deep-link') {
            const row = await this.repository.createLinkToken({
                token: start.persistToken.token,
                provider: id,
                ownerType: ctx.ownerType,
                ownerId: ctx.ownerId,
                createdBy: ctx.userId,
                expiresAt: start.persistToken.expiresAt,
            });
            if (!row) return null;
        }
        return start;
    }

    async createPersonalConnectLink(userId: number, provider: MessagingProviderId): Promise<MessagingConnectLinkResult | null> {
        return this.toLinkResult(provider, await this.beginConnect(provider, { ownerType: 'user', ownerId: userId, userId }));
    }

    async createProjectConnectLink(goalId: number, userId: number, provider: MessagingProviderId): Promise<MessagingConnectLinkResult | null> {
        return this.toLinkResult(provider, await this.beginConnect(provider, { ownerType: 'project', ownerId: goalId, userId }));
    }

    private toLinkResult(provider: MessagingProviderId, start: ConnectStart | null): MessagingConnectLinkResult | null {
        if (start?.kind !== 'deep-link') return null;
        return { provider, url: start.url, token: start.persistToken.token, expiresAt: start.persistToken.expiresAt.toISOString() };
    }

    async startOAuthConnect(provider: MessagingProviderId, ctx: ConnectContext): Promise<ConnectStart | null> {
        return this.beginConnect(provider, ctx);
    }

    async handleInbound(id: MessagingProviderId, raw: InboundRaw): Promise<{ redirect?: string } | null> {
        const provider = this.getProvider(id);
        if (!provider) return null;
        const intent = await provider.parseInbound(raw);
        if (!intent) return null;

        if (intent.kind === 'createConnection') {
            await this.repository.createConnection(intent.connection);
            if (intent.identity) await this.repository.upsertIdentity({ userId: intent.identity.userId, provider: id, externalUserId: intent.identity.externalUserId, externalTeamId: intent.identity.externalTeamId });
            return { redirect: intent.redirect };
        }

        if (intent.kind === 'command') {
            const reply = await this.runCreateTask(id, intent);
            await provider.deliver({ chatId: intent.chatId, accessToken: null, message: reply });
            return null;
        }

        await this.bindByToken(id, provider, intent);
        return null;
    }

    private async runCreateTask(id: MessagingProviderId, intent: Extract<InboundIntent, { kind: 'command' }>): Promise<MessagingMessage> {
        const note = (title: string): MessagingMessage => ({ event: 'task.created', title });

        const userId = await this.repository.findUserIdByExternalId({ provider: id, externalUserId: intent.externalUserId, externalTeamId: null });
        if (!userId) return note('Link your account in TaskView first (Personal → Connect), then try /task again.');

        const goalIds = await this.repository.fetchProjectGoalIdsByChannel({ provider: id, channelId: intent.chatId, externalTeamId: null });
        if (goalIds.length === 0) return note('This chat is not linked to a TaskView project.');
        if (goalIds.length > 1) return note('This chat is linked to several projects — create the task in TaskView.');

        const appUser = await this.buildAppUser(userId);
        if (!appUser) return note('Could not resolve your TaskView account.');

        const checker = await appUser.permissionsFetcher.getCheckerForGoal(goalIds[0]);
        if (!checker.hasPermissions(GoalPermissions.COMPONENT_CAN_ADD_TASKS)) {
            return note('You do not have permission to create tasks in this project.');
        }

        const created = await appUser.tasksManager.addTaskNew({ goalId: goalIds[0], description: intent.text });
        const task = created?.[0];
        if (!task) return note('Failed to create the task.');

        const orgSlug = await this.repository.fetchGoalOrgSlug(goalIds[0]);
        const url = buildTaskDeepLink(orgSlug, goalIds[0], task.id, task.goalListId ?? null);
        return { event: 'task.created', title: '✅ Task created', body: intent.text, url };
    }

    private async buildAppUser(userId: number): Promise<AppUser | null> {
        const record = await new AppUser().authManager.repository.fetchUserById(userId);
        if (!record || record.block !== 0) return null;
        return new AppUser({ id: 0, userData: { id: record.id, login: record.login, email: record.email } });
    }

    private async bindByToken(id: MessagingProviderId, provider: MessagingProvider, intent: Extract<InboundIntent, { kind: 'bindByToken' }>): Promise<void> {
        const link = await this.repository.findValidLinkToken(id, intent.token);
        // Silently drop unknown/expired tokens or a token used in the wrong chat kind — no
        // reply, so the endpoint can't be used as an outbound-message amplifier.
        if (!link || link.ownerType !== intent.scope) return;

        const connection = await this.repository.createConnection({
            provider: id,
            ownerType: link.ownerType,
            ownerId: link.ownerId,
            targetChatId: intent.chatId,
            title: intent.title,
            externalTeamId: null,
            accessTokenEncrypted: null,
        });
        if (!connection) {
            $logger.error(`[Messaging] Failed to create ${id} connection for ${link.ownerType}=${link.ownerId}`);
            return;
        }

        // Telegram user IDs are globally unique, so there is no workspace to scope by.
        if (intent.scope === 'user') await this.repository.upsertIdentity({ userId: link.ownerId, provider: id, externalUserId: intent.externalUserId, externalTeamId: null });
        await this.repository.consumeLinkToken(link.id);

        const text = intent.scope === 'user'
            ? 'Done! Your TaskView account is linked — notifications will be delivered here.'
            : 'Done! This chat is connected to your TaskView project — project events will be posted here.';
        await provider.deliver({ chatId: intent.chatId, accessToken: null, message: { event: 'task.created', title: text } });
    }

    async fetchPersonalConnections(userId: number): Promise<MessagingConnectionForClient[]> {
        const connections = await this.repository.fetchByOwner('user', userId);
        return connections.map(c => this.toClient(c));
    }

    async togglePersonal(id: number, userId: number, isActive: boolean): Promise<MessagingConnectionForClient | null> {
        const updated = await this.repository.setActiveOwned({ id, ownerType: 'user', ownerId: userId, isActive });
        return updated ? this.toClient(updated) : null;
    }

    async deletePersonal(id: number, userId: number): Promise<boolean> {
        return this.repository.deleteOwned({ id, ownerType: 'user', ownerId: userId });
    }

    async updatePersonalEvents(id: number, userId: number, events: string[]): Promise<MessagingConnectionForClient | null> {
        const updated = await this.repository.updateEventsOwned({ id, ownerType: 'user', ownerId: userId, events: sanitizeMessagingEvents(events) });
        return updated ? this.toClient(updated) : null;
    }

    async fetchProjectConnections(goalId: number): Promise<MessagingConnectionForClient[]> {
        const connections = await this.repository.fetchByOwner('project', goalId);
        return connections.map(c => this.toClient(c));
    }

    async toggleProject(id: number, goalId: number, isActive: boolean): Promise<MessagingConnectionForClient | null> {
        // goalId was verified against the caller by IsGoalOwnerByGoalId; the WHERE
        // clause also binds the connection to that goal, so no cross-project mutation.
        const updated = await this.repository.setActiveOwned({ id, ownerType: 'project', ownerId: goalId, isActive });
        return updated ? this.toClient(updated) : null;
    }

    async deleteProject(id: number, goalId: number): Promise<boolean> {
        return this.repository.deleteOwned({ id, ownerType: 'project', ownerId: goalId });
    }

    async updateProjectEvents(id: number, goalId: number, events: string[]): Promise<MessagingConnectionForClient | null> {
        const updated = await this.repository.updateEventsOwned({ id, ownerType: 'project', ownerId: goalId, events: sanitizeMessagingEvents(events) });
        return updated ? this.toClient(updated) : null;
    }

    async updateProjectPostContent(id: number, goalId: number, postContent: boolean): Promise<MessagingConnectionForClient | null> {
        const updated = await this.repository.setPostContentOwned({ id, ownerType: 'project', ownerId: goalId, postContent });
        return updated ? this.toClient(updated) : null;
    }

    private toClient(connection: MessagingConnectionsSchemaTypeForSelect): MessagingConnectionForClient {
        const { accessTokenEncrypted, ...rest } = connection;
        return rest;
    }
}
