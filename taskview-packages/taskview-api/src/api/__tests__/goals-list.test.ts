import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,

} from 'vitest';
import { initApi } from './init-api';

describe('TvApi', () => {
    let $api: TvApi;
    let goalId: number;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const addGoalResponse = await $api.goals.createGoal({
            name: 'Goal for list tests',
        }).catch(console.error);

        if (!addGoalResponse) {
            throw new Error('Failed to add goal');
        }

        goalId = addGoalResponse?.id!;
    });

    describe('List add', async () => {
        it('should add list with name', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                goalId: goalId,
            }).catch(console.error);

            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            expect(addListResponse?.id).toBeDefined();
            expect(addListResponse?.name).toBe('List for goal tests');
            expect(addListResponse?.description).toBeDefined();
            expect(addListResponse?.dateCreation).toBeDefined();
            expect(addListResponse?.goalId).toBeDefined();
            expect(addListResponse?.owner).toBeDefined();
            expect(addListResponse?.creatorId).toBeDefined();
            expect(addListResponse?.editDate).toBeDefined();
            expect(addListResponse?.archive).toBe(0);
        });

        it('should add list with name and description', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                description: 'Description for goal tests',
                goalId: goalId,
            }).catch(console.error);

            // console.log(addListResponse);

            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            expect(addListResponse?.id).toBeDefined();
            expect(addListResponse?.name).toBe('List for goal tests');
            expect(addListResponse?.description).toBe('Description for goal tests');
            expect(addListResponse?.dateCreation).toBeDefined();
            expect(addListResponse?.goalId).toBe(goalId);
            expect(addListResponse?.owner).toBeDefined();
            expect(addListResponse?.creatorId).toBeDefined();
            expect(addListResponse?.editDate).toBeDefined();
            expect(addListResponse?.archive).toBe(0);
        });

    });

    describe('List update', () => {
        it('should update list with name', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                goalId: goalId,
            }).catch(console.error);

            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            const newName = `'Updated list for goal tests'-${Date.now()}`;

            const updateListResponse = await $api.goalLists.updateList({
                id: addListResponse?.id!,
                name: newName,
            }).catch(console.error);

            if (!updateListResponse) {
                throw new Error('Failed to update list');
            }

            expect(updateListResponse?.name).toBe(newName);
        });
        it('should update list with name and description', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                goalId: goalId,
            }).catch(console.error);

            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            const newName = `'Updated list for goal tests'-${Date.now()}`;
            const newDescription = `'Updated description for goal tests'-${Date.now()}`;
            const updateListResponse = await $api.goalLists.updateList({
                id: addListResponse?.id!,
                name: newName,
                description: newDescription,
            }).catch(console.error);

            if (!updateListResponse) {
                throw new Error('Failed to update list');
            }

            expect(updateListResponse?.name).toBe(newName);
            expect(updateListResponse?.description).toBe(newDescription);
        });
        it('should update archive', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                goalId: goalId,
            }).catch(console.error);


            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            const updateArchiveResponse = await $api.goalLists.updateList({
                id: addListResponse?.id!,
                archive: 1,
            }).catch(console.error);

            if (!updateArchiveResponse) {
                throw new Error('Failed to update archive');
            }

            expect(updateArchiveResponse?.archive).toBe(1);
        });
    });
    describe('List delete', () => {
        it('should delete list', async () => {
            const addListResponse = await $api.goalLists.createList({
                name: 'List for goal tests',
                goalId: goalId,
            }).catch(console.error);

            if (!addListResponse) {
                throw new Error('Failed to add list');
            }

            const deleteListResponse = await $api.goalLists.deleteList(addListResponse?.id!).catch(console.error);

            if (!deleteListResponse) {
                throw new Error('Failed to delete list');
            }

            expect(deleteListResponse).toBe(true);
        });
    });

    describe('List fetch', () => {
        it('should fetch lists', async () => {
            const goalData = await $api.goals.createGoal({
                name: 'Goal for list tests',
            }).catch(console.error);

            if (!goalData) {
                throw new Error('Failed to add goal');
            }

            const fetchListsResponse = await $api.goalLists.fetchLists({ goalId: goalData?.id! }).catch(console.error);

            if (!fetchListsResponse) {
                throw new Error('Failed to fetch lists');
            }

            expect(fetchListsResponse.length).toBe(0);
        });

        it('should fetch lists in descending order', async () => {
            const goalData = await $api.goals.createGoal({
                name: 'Goal for list tests',
            }).catch(console.error);

            if (!goalData) {
                throw new Error('Failed to add goal');
            }

            const time = Date.now();
            await $api.goalLists.createList({
                name: `List 1-${time}`,
                goalId: goalData?.id!,
            }).catch(console.error);

            await $api.goalLists.createList({
                name: `List 2-${time}`,
                goalId: goalData?.id!,
            }).catch(console.error);

            const fetchListsResponse = await $api.goalLists.fetchLists({ goalId: goalData?.id! }).catch(console.error);

            if (!fetchListsResponse) {
                throw new Error('Failed to fetch lists');
            }

            expect(fetchListsResponse.length).toBe(2);
            expect(fetchListsResponse[0].name).toBe(`List 2-${time}`);
            expect(fetchListsResponse[1].name).toBe(`List 1-${time}`);
        });
    });
});