import type { TagsSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import { $logger } from '../../modules/logget';
import { TagItemForClient } from './TagItemForClient';
import { TagsRepository } from './TagsRepository';
import type {
    AddTagArg,
    DeleteTagArg,
    TagItemArgAdd,
    TagItemArgDelete,
    TagItemArgToggle,
    TagItemArgUpdate,
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

    async fetchAllTagsForUser() {
        const userId = this.user.getUserData()?.id;
        if (!userId) {
            $logger.error(`Can not fetch tags for undefined user`);
            return [];
        }
        const tags = await this.repository.fetchAllTagsForUser(userId);
        return tags;
    }

    /** @deprecated use toggleTagNew instead */
    async toggleTag(args: ToggleTagArg): Promise<'delete' | 'add' | false> {
        const tagExists = await this.repository.tagExists(args.tagId, args.taskId);

        if (tagExists) {
            await this.repository.deleteTagFromTask(args.tagId, args.taskId);
            return 'delete';
        }

        await this.repository.addTagToTask(args.tagId, args.taskId);
        return 'add';
    }

    async toggleTagNew(data: TagItemArgToggle): Promise<'delete' | 'add' | null> {
        return await this.repository.toggleTagNew(data.tagId, data.taskId);
    }

    /** @deprecated use deleteTagNew instead */
    async deleteTag(args: DeleteTagArg): Promise<boolean> {
        return await this.repository.deleteTag(args.tagId);
    }

    async deleteTagNew(data: TagItemArgDelete): Promise<boolean> {
        return await this.repository.deleteTagNew(data.tagId);
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
}
