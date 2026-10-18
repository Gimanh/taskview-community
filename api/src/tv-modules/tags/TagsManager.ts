import type { TagsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { eventBus } from '../../core/EventBus';
import { $logger } from '../../modules/logget';
import { TagItemForClient } from './TagItemForClient';
import { TagsRepository } from './TagsRepository';
import type {
    AddTagArg,
    DeleteTagArg,
    TagAddToTaskIfAbsentArgs,
    TagItemArgAdd,
    TagItemArgDelete,
    TagItemArgToggle,
    TagItemArgUpdate,
    TagItemInDb,
    TaskTagChange,
    ToggleTagArg,
    UpdateTagArgs,
} from './tags.types';

export class TagsManager {
    private readonly user: AppUser;
    public readonly repository: TagsRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new TagsRepository(this.user);
    }
    /** @deprecated use addTagNew instead */
    async addTag(arg: AddTagArg) {
        const tag = await this.repository.addTag(arg.name, arg.color, arg.goalId);

        if (!tag) {
            return false;
        }

        return new TagItemForClient(tag);
    }

    async addTagNew(data: TagItemArgAdd) {
        return await this.repository.addTagNew(data);
    }

    /** @deprecated use fetchAllTagsForUser instead */
    async fetchAll() {
        const userId = this.user.getUserData()?.id;
        if (!userId) {
            $logger.error(`Can not fetch tags for undefined user`);
            return [];
        }
        const tags = await this.repository.fetchAll(userId);
        if (!tags) {
            return [];
        }
        return tags.map((item) => new TagItemForClient(item));
    }

    async fetchAllTagsForUser(organizationId?: number) {
        const userId = this.user.getUserData()?.id;
        if (!userId) {
            $logger.error(`Can not fetch tags for undefined user`);
            return [];
        }
        const tags = await this.repository.fetchAllTagsForUser(userId, organizationId);
        return tags;
    }

    /** @deprecated use toggleTagNew instead */
    async toggleTag(args: ToggleTagArg): Promise<'delete' | 'add' | false> {
        const tagExists = await this.repository.tagExists(args.tagId, args.taskId);

        if (tagExists) {
            await this.repository.deleteTagFromTask(args.tagId, args.taskId);
            this.emitTagsChanged({ taskId: args.taskId, tagId: args.tagId, added: false });
            return 'delete';
        }

        await this.repository.addTagToTask(args.tagId, args.taskId);
        this.emitTagsChanged({ taskId: args.taskId, tagId: args.tagId, added: true });
        return 'add';
    }

    async toggleTagNew(data: TagItemArgToggle): Promise<'delete' | 'add' | null> {
        const result = await this.repository.toggleTagNew(data.tagId, data.taskId);
        if (result) this.emitTagsChanged({ taskId: data.taskId, tagId: data.tagId, added: result === 'add' });
        return result;
    }

    async addTagToTaskIfAbsent(args: TagAddToTaskIfAbsentArgs): Promise<boolean | null> {
        const added = await this.repository.addTagToTaskIfAbsent(args);
        if (added) this.emitTagsChanged({ taskId: args.taskId, tagId: args.tagId, added: true });
        return added;
    }

    /** @deprecated use deleteTagNew instead */
    async deleteTag(args: DeleteTagArg): Promise<boolean> {
        const tag = await this.repository.fetchTagById(args.tagId);
        const deleted = await this.repository.deleteTag(args.tagId);
        if (deleted && tag) this.emitTagDeleted(tag);
        return deleted;
    }

    async deleteTagNew(data: TagItemArgDelete): Promise<boolean> {
        const tag = await this.repository.fetchTagById(data.tagId);
        const deleted = await this.repository.deleteTagNew(data.tagId);
        if (deleted && tag) this.emitTagDeleted(tag);
        return deleted;
    }

    /** @deprecated use updateTagNew instead */
    async updateTag(args: UpdateTagArgs): Promise<TagItemForClient | false> {
        const tag = await this.repository.updateTag(args.id, args.name, args.color, args.goalId);

        if (!tag) {
            return false;
        }
        return new TagItemForClient(tag);
    }

    async updateTagNew(data: TagItemArgUpdate): Promise<TagsSchemaTypeForSelect | null> {
        return await this.repository.updateTagNew(data);
    }

    private emitTagsChanged(change: TaskTagChange): void {
        eventBus.emit('task.tagsChanged', { ...change, initiatorId: this.user.getUserData()?.id as number });
    }

    private emitTagDeleted(tag: TagItemInDb): void {
        if (tag.goal_id === null) return;
        eventBus.emit('tag.deleted', { tagId: tag.id, goalId: tag.goal_id, initiatorId: this.user.getUserData()?.id as number });
    }
}
