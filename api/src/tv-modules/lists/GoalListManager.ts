import type { GoalsListSchemaTypeForSelect } from 'taskview-db-schemas';
import type { AppUser } from '../../core/AppUser';
import type { GoalListInDb } from '../../types/goal-list.types';
import { GoalListItemForClient } from './GoalListItemForClient';
import { GoalListsRepository } from './GoalListsRepository';
import type { GoalListArgAdd, GoalListArgDelete, GoalListArgFetch, GoalListArgUpdate } from './list.types';

export class GoalListManager {
    public readonly user: AppUser;
    public readonly repository: GoalListsRepository;

    constructor(user: AppUser) {
        this.user = user;
        this.repository = new GoalListsRepository();
    }

    /**@deprecated use fetchListsNew instead */
    async fetchLists(goalId: number): Promise<GoalListItemForClient[]> {
        const lists = await this.repository.fetchAllLists(goalId);
        if (!lists) {
            return [];
        }
        return lists.map((list) => new GoalListItemForClient(list));
    }

    async fetchListsNew(data: GoalListArgFetch) {
        return await this.repository.fetchListsNew(data);
    }

    async addList(name: string, goalId: number, user: AppUser): Promise<GoalListItemForClient | false> {
        const add = await this.repository.addList(name, goalId, user);
        if (!add) {
            return false;
        }
        return new GoalListItemForClient(add);
    }

    async addListNew(data: GoalListArgAdd): Promise<GoalsListSchemaTypeForSelect[]> {
        return await this.repository.addListNew({ ...data, creatorId: this.user.getUserData()?.id! });
    }

    /**
     *
     * @deprecated use updateListNew instead
     */
    async updateList(listId: number, name: string): Promise<GoalListItemForClient | false> {
        const updateResult = await this.repository.updateList(listId, name);

        if (!updateResult) {
            return false;
        }

        const listInDb = await this.repository.fetchListById(listId);

        if (!listInDb) {
            return false;
        }

        return new GoalListItemForClient(listInDb);
    }

    async updateListNew(data: GoalListArgUpdate): Promise<GoalsListSchemaTypeForSelect[]> {
        return await this.repository.updateListNew(data);
    }

    /**
     * @deprecated use deleteListNew instead
     */
    async deleteList(listId: number): Promise<boolean> {
        return await this.repository.deleteList(listId);
    }

    async deleteListNew(data: GoalListArgDelete): Promise<boolean> {
        return await this.repository.deleteListNew(data);
    }

    async updateArchive(listId: number, archive: GoalListInDb['archive']): Promise<boolean> {
        return await this.repository.updateArchive(listId, archive);
    }
}
