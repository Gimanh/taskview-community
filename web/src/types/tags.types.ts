import type { TagItem as TagItemFromApi } from 'taskview-api'

export type TagItem = TagItemFromApi;

export type TagsState = {
    tags: TagItem[];
    tagsMap: Map<number, TagItem>;
    loading: boolean;
};
