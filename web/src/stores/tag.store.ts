import { defineStore } from 'pinia';
import type { TagItemArgAdd, TagItemArgToggle, TagItemArgUpdate, TagItemResponseToggle } from 'taskview-api';
import { $tvApi } from '@/plugins/axios';
import type { TagItem, TagsState } from '@/types/tags.types';
import { useGoalListsStore } from './goal-lists.store';
import { useGoalsStore } from './goals.store';

export const useTagsStore = defineStore('tags', {
    state(): TagsState {
        return {
            tags: [],
            tagsMap: new Map(),
            loading: false,
        };
    },

    getters: {
        filteredTags(state) {
            const goalListStore = useGoalListsStore();
            const goalsStore = useGoalsStore();
            return state.tags.filter(
                (tag) =>
                    (tag.goalId === null || tag.goalId === goalListStore.currentGoalId) &&
                    tag.owner === goalsStore.selectedGoal?.owner
            );
        },
    },
    actions: {
        async fetchAllTags(): Promise<void> {
            this.loading = true;

            const tags = await $tvApi.tags
                .fetchAllTagsForUser()
                .catch((err) => console.log(err))
                .finally(() => {
                    this.loading = false;
                });

            if (!tags) {
                return;
            }
            this.tags = tags;

            this.tags.forEach((tag) => {
                this.tagsMap.set(tag.id, tag);
            });
        },

        async addTag(tagData: TagItemArgAdd): Promise<boolean> {
            this.loading = true;
            const result = await $tvApi.tags
                .createTag(tagData)
                .catch((err) => console.log(err))
                .finally(() => {
                    this.loading = false;
                });
            if (!result) return false;
            this.tags.push(result);
            this.tagsMap.set(result.id, result);
            return true;
        },

        async deleteTag(tagId: TagItem['id']): Promise<void> {
            this.loading = true;

            const deleteResult = await $tvApi.tags
                .deleteTag({ tagId })
                .catch((err) => console.log(err))
                .finally(() => {
                    this.loading = false;
                });

            if (!deleteResult) return;

            const index = this.tags.findIndex((tag) => +tag.id === +tagId);
            if (index === -1) return;

            this.tagsMap.delete(this.tags[index].id);
            this.tags.splice(index, 1);
        },

        async toggleTag(data: TagItemArgToggle): Promise<TagItemResponseToggle['action'] | undefined> {
            const result = await $tvApi.tags
                .toggleTag(data)
                .catch(console.error)
                .finally(() => {
                    this.loading = false;
                });

            if (!result) return undefined;

            return result.action;
        },

        async updateTag(newTag: TagItemArgUpdate) {
            this.loading = true;
            const updateResult = await $tvApi.tags
                .updateTag(newTag)
                .catch((err) => console.log(err))
                .finally(() => {
                    this.loading = false;
                });
            if (!updateResult) return;
            const tag = this.tags.find((tag) => tag.id === newTag.id);
            if (!tag) return;
            Object.assign(tag, newTag);
        },
    },
});
