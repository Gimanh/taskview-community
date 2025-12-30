import type { TagItemInDb } from './tags.types';

/** @deprecated */
export class TagItemForClient {
    public readonly id: number;
    public readonly name: string;
    public readonly color: string;
    public readonly owner: number;
    public readonly goalId: number | null;

    constructor(item: TagItemInDb) {
        this.id = item.id;
        this.name = item.name;
        this.color = item.color;
        this.owner = item.owner;
        this.goalId = item.goal_id;
    }
}
