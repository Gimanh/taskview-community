import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { WebhooksSchema, WebhookDeliveriesSchema, type WebhooksSchemaTypeForSelect, type WebhookDeliveriesSchemaTypeForSelect } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';

export class WebhooksRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    async create(data: { goalId: number; url: string; secretEncrypted: string; events: string[] }): Promise<WebhooksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(WebhooksSchema).values(data).returning()
        );
        return result?.[0] ?? null;
    }

    async update(id: number, data: Partial<{ url: string; events: string[]; isActive: boolean }>): Promise<WebhooksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhooksSchema)
                .set({ ...data, updatedAt: new Date() })
                .where(eq(WebhooksSchema.id, id))
                .returning()
        );
        return result?.[0] ?? null;
    }

    async updateSecret(id: number, secretEncrypted: string): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhooksSchema)
                .set({ secretEncrypted, updatedAt: new Date() })
                .where(eq(WebhooksSchema.id, id))
                .returning()
        );
        return (result?.length ?? 0) > 0;
    }

    async delete(id: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(WebhooksSchema).where(eq(WebhooksSchema.id, id))
        );
        return !!result?.rowCount;
    }

    async fetchById(id: number): Promise<WebhooksSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(WebhooksSchema).where(eq(WebhooksSchema.id, id))
        );
        return result?.[0] ?? null;
    }

    async fetchByGoalId(goalId: number): Promise<WebhooksSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(WebhooksSchema).where(eq(WebhooksSchema.goalId, goalId))
        );
        return result ?? [];
    }

    async fetchActiveByGoalIdAndEvent(goalId: number, event: string): Promise<WebhooksSchemaTypeForSelect[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(WebhooksSchema).where(
                and(
                    eq(WebhooksSchema.goalId, goalId),
                    eq(WebhooksSchema.isActive, true),
                )
            )
        );
        return (result ?? []).filter(w => w.events.includes(event));
    }

    async createDelivery(data: { webhookId: number; event: string; payload: unknown }): Promise<WebhookDeliveriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(WebhookDeliveriesSchema).values({
                webhookId: data.webhookId,
                event: data.event,
                payload: data.payload,
            }).returning()
        );
        return result?.[0] ?? null;
    }

    async updateDelivery(id: number, data: { status: string; responseCode?: number; attempts: number }): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhookDeliveriesSchema)
                .set({ ...data, lastAttemptAt: new Date() })
                .where(eq(WebhookDeliveriesSchema.id, id))
        );
    }

    async fetchDeliveryById(id: number): Promise<WebhookDeliveriesSchemaTypeForSelect | null> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(WebhookDeliveriesSchema).where(eq(WebhookDeliveriesSchema.id, id))
        );
        return result?.[0] ?? null;
    }

    async fetchDeliveries(webhookId: number, options?: { cursor?: number; status?: string; limit?: number }): Promise<WebhookDeliveriesSchemaTypeForSelect[]> {
        const limit = options?.limit ?? 20;
        const conditions = [eq(WebhookDeliveriesSchema.webhookId, webhookId)];

        if (options?.cursor) {
            conditions.push(lt(WebhookDeliveriesSchema.id, options.cursor));
        }
        if (options?.status) {
            conditions.push(eq(WebhookDeliveriesSchema.status, options.status));
        }

        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(WebhookDeliveriesSchema)
                .where(and(...conditions))
                .orderBy(desc(WebhookDeliveriesSchema.id))
                .limit(limit)
        );
        return result ?? [];
    }

    async resetConsecutiveFailures(webhookId: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhooksSchema)
                .set({ consecutiveFailures: 0 })
                .where(eq(WebhooksSchema.id, webhookId))
        );
    }

    async incrementConsecutiveFailures(webhookId: number): Promise<number> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhooksSchema)
                .set({ consecutiveFailures: sql`${WebhooksSchema.consecutiveFailures} + 1` })
                .where(eq(WebhooksSchema.id, webhookId))
                .returning({ consecutiveFailures: WebhooksSchema.consecutiveFailures })
        );
        return result?.[0]?.consecutiveFailures ?? 0;
    }

    async deactivate(webhookId: number): Promise<void> {
        await callWithCatch(() =>
            this.db.dbDrizzle.update(WebhooksSchema)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(WebhooksSchema.id, webhookId))
        );
    }
}
