import { type } from 'arktype';
import type { InferSelectModel } from 'drizzle-orm';
import type { GraphRelationsSchema } from 'taskview-db-schemas';

export const GraphRelationsArkType = type({
    fromTaskId: 'number',
    toTaskId: 'number',
    'nodeMetadata?': 'object',
});

export type GraphArgRelationsType = typeof GraphRelationsArkType.infer;
export type GraphReturnRelationsType = InferSelectModel<typeof GraphRelationsSchema>;
