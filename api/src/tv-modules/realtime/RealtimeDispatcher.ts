import { eq } from 'drizzle-orm';
import { CollaborationUsersSchema, UsersSchema } from 'taskview-db-schemas';
import { getCentrifugoClient } from '../../core/CentrifugoClient';
import type { Dispatcher } from '../../core/Dispatcher';
import { eventBus, type AppEvents } from '../../core/EventBus';
import { Database } from '../../modules/db';

export class RealtimeDispatcher implements Dispatcher {
    register(): void {
        eventBus.on('collaboration.userAdded', (data) => this.onCollaborationUserAdded(data));
        eventBus.on('collaboration.userRemoved', (data) => this.onCollaborationUserRemoved(data));
        eventBus.on('collaboration.rolesChanged', (data) => this.onCollaborationRolesChanged(data));
    }

    async registerWorkers(): Promise<void> {}

    private async onCollaborationUserAdded(data: AppEvents['collaboration.userAdded']): Promise<void> {
        const userId = await this.resolveAuthUserIdByEmail(data.email);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async onCollaborationUserRemoved(data: AppEvents['collaboration.userRemoved']): Promise<void> {
        const userId = await this.resolveAuthUserIdByCollaborationUserId(data.collaborationUserId);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async onCollaborationRolesChanged(data: AppEvents['collaboration.rolesChanged']): Promise<void> {
        const userId = await this.resolveAuthUserIdByCollaborationUserId(data.collaborationUserId);
        if (!userId) return;

        await this.publishToUser(userId, 'goals.changed', { goalId: data.goalId });
    }

    private async publishToUser(userId: number, event: string, data: Record<string, unknown>): Promise<void> {
        const centrifugo = getCentrifugoClient();
        await centrifugo.publishToUser(userId, event, data);
    }

    private async resolveAuthUserIdByEmail(email: string): Promise<number | null> {
        const db = Database.getInstance();
        const result = await db.dbDrizzle
            .select({ id: UsersSchema.id })
            .from(UsersSchema)
            .where(eq(UsersSchema.email, email))
            .limit(1);

        return result[0]?.id ?? null;
    }

    private async resolveAuthUserIdByCollaborationUserId(collaborationUserId: number): Promise<number | null> {
        const db = Database.getInstance();
        const result = await db.dbDrizzle
            .select({ id: UsersSchema.id })
            .from(CollaborationUsersSchema)
            .innerJoin(UsersSchema, eq(CollaborationUsersSchema.email, UsersSchema.email))
            .where(eq(CollaborationUsersSchema.id, collaborationUserId))
            .limit(1);

        return result[0]?.id ?? null;
    }
}
