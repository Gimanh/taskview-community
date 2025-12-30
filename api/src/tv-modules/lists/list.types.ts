import { type } from 'arktype';

export const GoalListArkTypeAdd = type({
    name: 'string',
    description: type('string | null').optional(),
    goalId: 'number',
});

export type GoalListArgAdd = typeof GoalListArkTypeAdd.infer;

export const GoalListArkTypeUpdate = type({
    id: 'number',
    name: type('string | null').optional(),
    description: type('string | null').optional(),
});

export type GoalListArgUpdate = typeof GoalListArkTypeUpdate.infer;

export const GoalListArkTypeDelete = type({
    id: 'number',
});

export type GoalListArgDelete = typeof GoalListArkTypeDelete.infer;

export const GoalListArkTypeFetch = type({
    goalId: type('string').pipe((v) => Number(v)),
});

export type GoalListArgFetch = typeof GoalListArkTypeFetch.infer;
