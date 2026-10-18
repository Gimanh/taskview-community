import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { CollaborationUsersSchema, CollaborationUsersToGoalsSchema, GoalsSchema, OrganizationsSchema, TasksSchema, UsersSchema } from 'taskview-db-schemas';
import { Database } from '../../../modules/db';
import { RealtimeRepository } from '../RealtimeRepository';

const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
const db = () => Database.getInstance().dbDrizzle;

let ownerId = 0;
let collaboratorId = 0;
let collabUserId = 0;
let goalId = 0;
let taskId = 0;

describe('RealtimeRepository', () => {
    beforeAll(async () => {
        const users = await db()
            .insert(UsersSchema)
            .values([
                { login: `rt-owner-${stamp}`, email: `rt-owner-${stamp}@test.local`, password: 'x' },
                { login: `rt-member-${stamp}`, email: `rt-member-${stamp}@test.local`, password: 'x' },
            ])
            .returning({ id: UsersSchema.id });
        [ownerId, collaboratorId] = users.map((user) => user.id);

        const [{ id: organizationId }] = await db()
            .insert(OrganizationsSchema)
            .values({ name: `rt-${stamp}`, slug: `rt-${stamp}`, ownerId })
            .returning({ id: OrganizationsSchema.id });
        [{ id: goalId }] = await db()
            .insert(GoalsSchema)
            .values({ name: `rt-${stamp}`, owner: ownerId, organizationId })
            .returning({ id: GoalsSchema.id });
        [{ id: collabUserId }] = await db()
            .insert(CollaborationUsersSchema)
            .values({ email: `rt-member-${stamp}@test.local` })
            .returning({ id: CollaborationUsersSchema.id });
        await db().insert(CollaborationUsersToGoalsSchema).values({ userId: collabUserId, goalId });
        [{ id: taskId }] = await db().insert(TasksSchema).values({ goalId, description: 'realtime' }).returning({ id: TasksSchema.id });
    });

    afterAll(async () => {
        await db().delete(CollaborationUsersSchema).where(eq(CollaborationUsersSchema.id, collabUserId));
        await db().delete(UsersSchema).where(inArray(UsersSchema.id, [ownerId, collaboratorId]));
    });

    it('lists the owner and the collaborators of a project as auth user ids', async () => {
        const ids = await new RealtimeRepository().fetchGoalMemberIds(goalId);
        expect(ids.sort()).toEqual([ownerId, collaboratorId].sort());
    });

    it('resolves the project of a task', async () => {
        expect(await new RealtimeRepository().fetchTaskGoalId(taskId)).toBe(goalId);
        expect(await new RealtimeRepository().fetchTaskGoalId(2_147_483_000)).toBeNull();
    });
});
