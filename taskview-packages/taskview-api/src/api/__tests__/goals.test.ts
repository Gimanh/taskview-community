import { TvApi } from '@/tv';
import { AxiosError } from 'axios';
import {
    describe,
    it,
    expect,
    beforeAll,

} from 'vitest';
import { initApi } from './init-api';

describe('TvApi', () => {
    let $api: TvApi;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;
    });

    //GOALS TESTS ------------------------------------------------------------
    describe('Goals add', () => {
        it('should add goal with name', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }


            expect(addGoalResponse?.id).toBeDefined();
            expect(addGoalResponse?.name).toEqual('test goal');
            expect(addGoalResponse?.description).toEqual(null);
            expect(addGoalResponse?.color).toEqual(null);
            // owner id has number 1 in the database
            expect(addGoalResponse?.owner).toEqual(1);
        });

        it('should add goal with name and description', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
                description: 'test description',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            expect(addGoalResponse?.id).toBeDefined();
            expect(addGoalResponse?.name).toEqual('test goal');
            expect(addGoalResponse?.description).toEqual('test description');
            expect(addGoalResponse?.color).toEqual(null);
        });

        it('should add goal with name and color', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
                color: 'test color',
                description: 'test description',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            expect(addGoalResponse?.id).toBeDefined();
            expect(addGoalResponse?.name).toEqual('test goal');
            expect(addGoalResponse?.description).toEqual('test description');
            expect(addGoalResponse?.color).toEqual('test color');
        });

        it('should add goal with name and color and description', async () => {
            //@ts-expect-error - we are testing the error case
            const addGoalResponse = await $api.goals.createGoal({})
                .catch((error: AxiosError) => {
                    return error.status
                });
            expect(addGoalResponse).toEqual(400);
        });
    });

    describe('Goals update', () => {
        it('should update goal with name', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            const updateGoalResponse = await $api.goals.updateGoal({
                id: addGoalResponse?.id!,
                name: 'test goal updated name',
            }).catch(console.error);

            if (!updateGoalResponse) {
                throw new Error('Failed to update goal');
            }

            expect(updateGoalResponse?.id).toEqual(addGoalResponse?.id);
            expect(updateGoalResponse?.name).toEqual('test goal updated name');
            expect(updateGoalResponse?.description).toEqual(null);
            expect(updateGoalResponse?.color).toEqual(null);
            expect(updateGoalResponse?.permissions).toBeDefined();
        });

        it('should update goal with description', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
                description: 'test description',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            const updateGoalResponse = await $api.goals.updateGoal({
                id: addGoalResponse?.id!,
                description: 'test description updated',
                name: 'test goal updated name',
                color: 'test color updated',
            }).catch(console.error);

            if (!updateGoalResponse) {
                throw new Error('Failed to update goal');
            }

            expect(updateGoalResponse?.id).toEqual(addGoalResponse?.id);
            expect(updateGoalResponse?.name).toEqual('test goal updated name');
            expect(updateGoalResponse?.description).toEqual('test description updated');
            expect(updateGoalResponse?.color).toEqual('test color updated');
        });
    });

    describe('Goals delete', () => {
        it('should delete goal', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            const deleteGoalResponse = await $api.goals.deleteGoal(addGoalResponse?.id!).catch(console.error);

            expect(deleteGoalResponse).toEqual(true);

            const deleteGoalResponseStatus = await $api.goals.deleteGoal(-400).catch((err: AxiosError) => err.status);
            expect(deleteGoalResponseStatus).toEqual(403);
        });
    });

    describe('Goals fetch', () => {
        it('should fetch goals', async () => {
            const addGoalResponse = await $api.goals.createGoal({
                name: 'test goal',
            }).catch(console.error);

            if (!addGoalResponse) {
                throw new Error('Failed to add goal');
            }

            expect(addGoalResponse?.permissions).toBeDefined();
            expect(addGoalResponse?.permissions?.goal_can_delete).toBe(true);

            const fetchGoalsResponse = await $api.goals.fetchGoals().catch(console.error);
            expect(fetchGoalsResponse).toBeDefined();
            const goal = fetchGoalsResponse?.find((goal) => goal.id === addGoalResponse?.id);

            expect(goal?.id).toEqual(addGoalResponse?.id);
            expect(goal?.name).toEqual('test goal');
            expect(goal?.description).toEqual(null);
            expect(goal?.color).toEqual(null);
            expect(goal?.permissions).toBeDefined();
        });
    });

    // describe('Goals fetch shared goals', () => {
    //     // TODO create test for shared goals (add user to goal and check if it
    //     //  is shared then delete user from goal and check if it is not shared)
    // });

    // describe('Goals permissions for shared goals', () => {
    //     //TODO check permissions for shared goals (test that permissions are correctly working for shared goals)
    // });
});