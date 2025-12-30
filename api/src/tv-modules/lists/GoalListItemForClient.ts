import type { GoalListInDb } from '../../types/goal-list.types';

export class GoalListItemForClient {
    public id: number;
    public name: string;
    public archive: GoalListInDb['archive'];
    public goalId: GoalListInDb['goal_id'];

    constructor(list: GoalListInDb) {
        this.id = list.id;
        this.name = list.name;
        this.archive = list.archive;
        this.goalId = list.goal_id;
    }
}
