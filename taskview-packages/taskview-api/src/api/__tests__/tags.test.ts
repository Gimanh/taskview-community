import { TvApi } from '@/tv';
import {
    describe,
    it,
    expect,
    beforeAll,

} from 'vitest';
import { initApi } from './init-api';

describe('TvApi tags tests', () => {
    let $api: TvApi;
    let goalId: number;

    beforeAll(async () => {
        const { $tvApi } = await initApi();
        $api = $tvApi;

        const addGoalResponse = await $api.goals.createGoal({
            name: `Goal for tags tests-${Date.now()}`,
        }).catch(console.error);

        if (!addGoalResponse) {
            throw new Error('Failed to add goal');
        }

        goalId = addGoalResponse?.id!;
    });

    describe('Tags add', () => {
        it('should add tag with name', async () => {
            const name = `test tag-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'test color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            expect(addTagResponse).toBeDefined();
            expect(addTagResponse.id).toBeDefined();
            expect(addTagResponse.name).toBe(name);
            expect(addTagResponse.color).toBe('test color');
            expect(addTagResponse.goalId).toBe(goalId);
            expect(addTagResponse.owner).toBe(1);
        });
    });

    describe('Tags delete', () => {
        it('should delete tag', async () => {
            const name = `test tag-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'test color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            const deleteTagResponse = await $api.tags.deleteTag({
                tagId: addTagResponse.id,
            }).catch(console.error);

            if (!deleteTagResponse) {
                throw new Error('Failed to delete tag');
            }

            expect(deleteTagResponse).toBe(true);
        });

        it('should fail to delete tag', async () => {
            const deleteTagResponse = await $api.tags.deleteTag({
                tagId: -400,
            }).catch((err) => err.status);

            //there is no tag with id -400, so it should return 400
            expect(deleteTagResponse).toBe(400);
        });
    });

    describe('Tags update', () => {
        it('should update tag', async () => {
            const name = `test tag-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'test color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            expect(addTagResponse).toBeDefined();
            expect(addTagResponse.id).toBeDefined();
            expect(addTagResponse.name).toBe(name);
            expect(addTagResponse.color).toBe('test color');
            expect(addTagResponse.goalId).toBe(goalId);
            expect(addTagResponse.owner).toBe(1);

            const updateTagResponse = await $api.tags.updateTag({
                id: addTagResponse.id,
                name: 'test tag updated',
                color: 'test color updated',
                goalId: goalId,
            }).catch(console.error);

            if (!updateTagResponse) {
                throw new Error('Failed to update tag');
            }

            expect(updateTagResponse).toBeDefined();
            expect(updateTagResponse.id).toBe(addTagResponse.id);
            expect(updateTagResponse.name).toBe('test tag updated');
            expect(updateTagResponse.color).toBe('test color updated');
            expect(updateTagResponse.goalId).toBe(goalId);

        });

        it('should update tag color', async () => {
            const name = `test tag-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'original color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            const updateTagResponse = await $api.tags.updateTag({
                id: addTagResponse.id,
                name: addTagResponse.name,
                color: '#00ff00',
                goalId: goalId,
            }).catch(console.error);

            if (!updateTagResponse) {
                throw new Error('Failed to update tag');
            }

            expect(updateTagResponse.id).toBe(addTagResponse.id);
            expect(updateTagResponse.color).toBe('#00ff00');
            expect(updateTagResponse.name).toBe(name);
        });
    });

    describe('Tags fetch all', () => {
        it('should fetch all tags', async () => {
            const name = `test tag-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'test color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            const fetchAllTagsResponse = await $api.tags.fetchAllTagsForUser().catch(console.error);
            if (!fetchAllTagsResponse) {
                throw new Error('Failed to fetch all tags');
            }
            const tag = fetchAllTagsResponse.find((tag) => tag.id === addTagResponse.id);
            expect(tag).toBeDefined();
            expect(tag?.name).toBe(name);
            expect(tag?.color).toBe('test color');
            expect(tag?.goalId).toBe(goalId);
            expect(tag?.owner).toBe(1);
        });

        it('should fetch tags filtered by goalId', async () => {
            const name = `test tag filtered-${Date.now()}`;
            const addTagResponse = await $api.tags.createTag({
                name: name,
                color: 'filter color',
                goalId: goalId,
            }).catch(console.error);

            if (!addTagResponse) {
                throw new Error('Failed to add tag');
            }

            const fetchAllTagsResponse = await $api.tags.fetchAllTagsForUser().catch(console.error);
            if (!fetchAllTagsResponse) {
                throw new Error('Failed to fetch all tags');
            }

            const tagsForGoal = fetchAllTagsResponse.filter((tag) => tag.goalId === goalId);
            expect(tagsForGoal.length).toBeGreaterThan(0);
            tagsForGoal.forEach((tag) => {
                expect(tag.goalId).toBe(goalId);
            });
        });
    });

    describe('Tags toggle', () => {
        it('should toggle tag on a task', async () => {
            const tag = await $api.tags.createTag({
                name: `toggle tag-${Date.now()}`,
                color: '#ff0000',
                goalId: goalId,
            }).catch(console.error);

            if (!tag) {
                throw new Error('Failed to add tag');
            }

            const task = await $api.tasks.createTask({
                goalId: goalId,
                description: 'toggle test',
            }).catch(console.error);

            if (!task) {
                throw new Error('Failed to create task');
            }

            const toggleResult = await $api.tags.toggleTag({
                taskId: task.id,
                tagId: tag.id,
            }).catch(console.error);

            if (!toggleResult) {
                throw new Error('Failed to toggle tag');
            }

            expect(toggleResult).toBeDefined();
        });

        it('should fail to toggle tag', async () => {
            const toggleTagResponse = await $api.tags.toggleTag({
                tagId: -400,
                taskId: -400,
            }).catch((err) => err.status);

            //there is no tag with id -400, so it should return 400
            expect(toggleTagResponse).toBe(403);
        });
    });
});