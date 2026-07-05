import { createHash } from 'crypto';
import { and, eq, gt, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
    CollaborationUsersSchema,
    CollaborationUsersToGoalsSchema,
    GoalsSchema,
    MessagingConnectionsSchema,
    MessagingIdentityMapSchema,
    MessagingLinkTokensSchema,
    OrganizationsSchema,
    TasksAssigneeSchema,
    UsersSchema,
    type MessagingConnectionsSchemaTypeForSelect,
    type MessagingLinkTokensSchemaTypeForSelect,
} from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import { SLACK_WEBHOOK_PREFIX } from './config';
import type {
    MessagingChannelLookup,
    MessagingConnectionCreate,
    MessagingIdentityLookup,
    MessagingIdentityUpsert,
    MessagingLinkTokenCreate,
    MessagingOwnedRef,
    MessagingOwnedToggle,
    MessagingRecipient,
} from './types.internal';

export class MessagingRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async createConnection(data: MessagingConnectionCreate): Promise<MessagingConnectionsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(MessagingConnectionsSchema)
                .values(data)
                .onConflictDoUpdate({
                    target: [
                        MessagingConnectionsSchema.provider,
                        MessagingConnectionsSchema.ownerType,
                        MessagingConnectionsSchema.ownerId,
                        MessagingConnectionsSchema.targetChatId,
                    ],
                    set: {
                        title: data.title,
                        externalTeamId: data.externalTeamId,
                        accessTokenEncrypted: data.accessTokenEncrypted,
                        isActive: true,
                        updatedAt: new Date(),
                    },
                })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async fetchById(id: number): Promise<MessagingConnectionsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(MessagingConnectionsSchema).where(eq(MessagingConnectionsSchema.id, id))
        );
        return result?.[0] ?? null;
    }

    async fetchByOwner(ownerType: string, ownerId: number): Promise<MessagingConnectionsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(MessagingConnectionsSchema).where(
                and(
                    eq(MessagingConnectionsSchema.ownerType, ownerType),
                    eq(MessagingConnectionsSchema.ownerId, ownerId),
                )
            )
        );
        return result ?? [];
    }

    async fetchActiveByOwner(ownerType: string, ownerId: number): Promise<MessagingConnectionsSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(MessagingConnectionsSchema).where(
                and(
                    eq(MessagingConnectionsSchema.ownerType, ownerType),
                    eq(MessagingConnectionsSchema.ownerId, ownerId),
                    eq(MessagingConnectionsSchema.isActive, true),
                )
            )
        );
        return result ?? [];
    }

    async setActiveOwned(args: MessagingOwnedToggle): Promise<MessagingConnectionsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(MessagingConnectionsSchema)
                .set({ isActive: args.isActive, updatedAt: new Date() })
                .where(this.ownedWhere(args))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async deleteOwned(args: MessagingOwnedRef): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(MessagingConnectionsSchema).where(this.ownedWhere(args))
        );
        return !!result?.rowCount;
    }

    private ownedWhere(args: MessagingOwnedRef) {
        return and(
            eq(MessagingConnectionsSchema.id, args.id),
            eq(MessagingConnectionsSchema.ownerType, args.ownerType),
            eq(MessagingConnectionsSchema.ownerId, args.ownerId),
        );
    }

    async resolveCollabIdsToRecipients(collabIds: number[]): Promise<MessagingRecipient[]> {
        if (collabIds.length === 0) return [];
        const authUsers = alias(UsersSchema, 'auth_users');
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ userId: authUsers.id, email: authUsers.email })
                .from(CollaborationUsersSchema)
                .innerJoin(authUsers, eq(CollaborationUsersSchema.email, authUsers.email))
                .where(inArray(CollaborationUsersSchema.id, collabIds))
        );
        return rows ?? [];
    }

    async updateEventsOwned(args: MessagingOwnedRef & { events: string[] }): Promise<MessagingConnectionsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(MessagingConnectionsSchema)
                .set({ events: args.events, updatedAt: new Date() })
                .where(this.ownedWhere(args))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async setPostContentOwned(args: MessagingOwnedRef & { postContent: boolean }): Promise<MessagingConnectionsSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(MessagingConnectionsSchema)
                .set({ postContent: args.postContent, updatedAt: new Date() })
                .where(this.ownedWhere(args))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async fetchCollabEmail(collabId: number): Promise<string | null> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ email: CollaborationUsersSchema.email })
                .from(CollaborationUsersSchema)
                .where(eq(CollaborationUsersSchema.id, collabId))
                .limit(1)
        );
        return rows?.[0]?.email ?? null;
    }

    async fetchProjectMemberRecipients(goalId: number): Promise<MessagingRecipient[]> {
        const authUsers = alias(UsersSchema, 'auth_users');
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ userId: authUsers.id, email: authUsers.email })
                .from(CollaborationUsersToGoalsSchema)
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id))
                .innerJoin(authUsers, eq(CollaborationUsersSchema.email, authUsers.email))
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId))
        );
        return rows ?? [];
    }

    async fetchGoalName(goalId: number): Promise<string | null> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ name: GoalsSchema.name }).from(GoalsSchema).where(eq(GoalsSchema.id, goalId)).limit(1)
        );
        return rows?.[0]?.name ?? null;
    }

    async fetchGoalOrgSlug(goalId: number): Promise<string | null> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ slug: OrganizationsSchema.slug })
                .from(GoalsSchema)
                .innerJoin(OrganizationsSchema, eq(GoalsSchema.organizationId, OrganizationsSchema.id))
                .where(eq(GoalsSchema.id, goalId))
                .limit(1)
        );
        return rows?.[0]?.slug ?? null;
    }

    async filterCollabIdsInGoal(collabIds: number[], goalId: number): Promise<number[]> {
        if (collabIds.length === 0) return [];
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ userId: CollaborationUsersToGoalsSchema.userId })
                .from(CollaborationUsersToGoalsSchema)
                .where(and(
                    eq(CollaborationUsersToGoalsSchema.goalId, goalId),
                    inArray(CollaborationUsersToGoalsSchema.userId, collabIds),
                ))
        );
        return (rows ?? []).map(r => r.userId);
    }

    async fetchCurrentAssigneeCollabIds(taskId: number): Promise<number[]> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ collabUserId: TasksAssigneeSchema.collabUserId })
                .from(TasksAssigneeSchema)
                .where(eq(TasksAssigneeSchema.taskId, taskId))
        );
        return (rows ?? []).map(r => r.collabUserId);
    }

    async createLinkToken(data: MessagingLinkTokenCreate): Promise<MessagingLinkTokensSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(MessagingLinkTokensSchema)
                .values({ ...data, token: this.hashToken(data.token) })
                .returning()
        );
        return result?.[0] ?? null;
    }

    async findValidLinkToken(provider: string, token: string): Promise<MessagingLinkTokensSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(MessagingLinkTokensSchema).where(
                and(
                    eq(MessagingLinkTokensSchema.provider, provider),
                    eq(MessagingLinkTokensSchema.token, this.hashToken(token)),
                    gt(MessagingLinkTokensSchema.expiresAt, new Date()),
                )
            )
        );
        return result?.[0] ?? null;
    }

    async consumeLinkToken(id: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.delete(MessagingLinkTokensSchema).where(eq(MessagingLinkTokensSchema.id, id))
        );
    }

    async findUserIdByExternalId(args: MessagingIdentityLookup): Promise<number | null> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ userId: MessagingIdentityMapSchema.userId })
                .from(MessagingIdentityMapSchema)
                .where(and(
                    eq(MessagingIdentityMapSchema.provider, args.provider),
                    eq(MessagingIdentityMapSchema.externalUserId, args.externalUserId),
                    args.externalTeamId === null
                        ? isNull(MessagingIdentityMapSchema.externalTeamId)
                        : eq(MessagingIdentityMapSchema.externalTeamId, args.externalTeamId),
                ))
                .limit(1)
        );
        return rows?.[0]?.userId ?? null;
    }

    async fetchProjectGoalIdsByChannel(args: MessagingChannelLookup): Promise<number[]> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ goalId: MessagingConnectionsSchema.ownerId })
                .from(MessagingConnectionsSchema)
                .where(and(
                    eq(MessagingConnectionsSchema.provider, args.provider),
                    eq(MessagingConnectionsSchema.ownerType, 'project'),
                    eq(MessagingConnectionsSchema.targetChatId, args.channelId),
                    eq(MessagingConnectionsSchema.isActive, true),
                    args.externalTeamId === null
                        ? isNull(MessagingConnectionsSchema.externalTeamId)
                        : eq(MessagingConnectionsSchema.externalTeamId, args.externalTeamId),
                ))
        );
        return rows?.map((r) => r.goalId) ?? [];
    }

    async fetchSlackBotTokenEncrypted(teamId: string): Promise<string | null> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.select({ token: MessagingConnectionsSchema.accessTokenEncrypted })
                .from(MessagingConnectionsSchema)
                .where(and(
                    eq(MessagingConnectionsSchema.provider, 'slack'),
                    eq(MessagingConnectionsSchema.externalTeamId, teamId),
                    eq(MessagingConnectionsSchema.isActive, true),
                ))
        );
        return rows?.map((r) => r.token).find((t): t is string => !!t && !t.startsWith(SLACK_WEBHOOK_PREFIX)) ?? null;
    }

    async fetchGoalCollabMembers(goalId: number): Promise<{ collabId: number; email: string }[]> {
        const rows = await callWithCatch(() =>
            this.db.dbDrizzle.selectDistinct({ collabId: CollaborationUsersSchema.id, email: CollaborationUsersSchema.email })
                .from(CollaborationUsersToGoalsSchema)
                .innerJoin(CollaborationUsersSchema, eq(CollaborationUsersToGoalsSchema.userId, CollaborationUsersSchema.id))
                .where(eq(CollaborationUsersToGoalsSchema.goalId, goalId))
        );
        return rows ?? [];
    }

    async upsertIdentity(args: MessagingIdentityUpsert): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.insert(MessagingIdentityMapSchema)
                .values({ userId: args.userId, provider: args.provider, externalUserId: args.externalUserId, externalTeamId: args.externalTeamId, linkedAt: new Date() })
                .onConflictDoUpdate({
                    target: [MessagingIdentityMapSchema.userId, MessagingIdentityMapSchema.provider],
                    set: { externalUserId: args.externalUserId, externalTeamId: args.externalTeamId, linkedAt: new Date() },
                })
        );
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }
}
