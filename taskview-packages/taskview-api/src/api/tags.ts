import TvApiBase from "./base";
import type { AppResponse } from "./base.types";
import type { TagItemArgAdd, TagItemArgDelete, TagItemArgToggle, TagItemArgUpdate, TagItemResponseAdd, TagItemResponseDelete, TagItemResponseFetch, TagItemResponseToggle, TagItemResponseUpdate } from "./tags.api.types";

export default class TvTagsApi extends TvApiBase {
    protected moduleUrl = '/module/tags';

    public async createTag(tagData: TagItemArgAdd) {
        return this.request(
            this.$axios.post<AppResponse<TagItemResponseAdd>>(
                `${this.moduleUrl}`, tagData
            )
        );
    }

    public async updateTag(tag: TagItemArgUpdate) {
        return this.request(
            this.$axios.patch<AppResponse<TagItemResponseUpdate>>(
                `${this.moduleUrl}`, tag
            )
        );
    }

    public async deleteTag(tagData: TagItemArgDelete) {
        return this.request(
            this.$axios.delete<AppResponse<TagItemResponseDelete>>(
                `${this.moduleUrl}`, { data: tagData }
            )
        );
    }

    public async fetchAllTagsForUser() {
        return this.request(
            this.$axios.get<AppResponse<TagItemResponseFetch>>(
                `${this.moduleUrl}`
            )
        );
    }

    public async toggleTag(tagData: TagItemArgToggle) {
        return this.request(
            this.$axios.patch<AppResponse<TagItemResponseToggle>>(
                `${this.moduleUrl}/toggle`, tagData
            )
        );
    }
}