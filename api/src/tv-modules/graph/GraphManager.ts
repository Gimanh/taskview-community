import type { AppUser } from '../../core/AppUser';
import { GraphRepository } from './GraphRepository';
import type { GraphArgRelationsType } from './types';

export class GraphManager {
    protected readonly user: AppUser;
    public readonly repository: GraphRepository;

    constructor(appUser: AppUser) {
        this.user = appUser;
        this.repository = new GraphRepository();
    }

    addEdge(data: GraphArgRelationsType) {
        return this.repository.addEdge(data);
    }

    async fetchAllEdges(goalId: number) {
        return await this.repository.fetchAllEdges(goalId);
    }

    async deleteEdge(id: number) {
        return await this.repository.deleteEdge(id);
    }
}
