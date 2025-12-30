import { eq } from 'drizzle-orm';
import { GraphRelationsSchema } from 'taskview-db-schemas';
import { Database } from '../../modules/db';
import { callWithCatch } from '../../utils/helpers';
import type { GraphArgRelationsType, GraphReturnRelationsType } from './types';

export class GraphRepository {
    private readonly db: Database;

    constructor() {
        this.db = Database.getInstance();
    }

    public async addEdge(data: GraphArgRelationsType): Promise<GraphReturnRelationsType[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.insert(GraphRelationsSchema).values(data).returning()
        );
        return result ?? [];
    }

    public async fetchAllEdges(goalId: number): Promise<GraphReturnRelationsType[]> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.select().from(GraphRelationsSchema).where(eq(GraphRelationsSchema.goalId, goalId))
        );
        return result ?? [];
    }

    public async deleteEdge(id: number): Promise<boolean> {
        const result = await callWithCatch(() =>
            this.db.dbDrizzle.delete(GraphRelationsSchema).where(eq(GraphRelationsSchema.id, id))
        );
        return !!result;
    }
}
