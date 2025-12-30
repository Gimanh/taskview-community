export type GoalListItem = {
    id: number;
    name: string;
    description: string;
    dateCreation: string;
    goalId: number;
    owner: number;
    creatorId: number;
    editDate: string;
    archive: 1 | 0;
}

export type GoalListItemArgAdd = {
    name: string;
    description?: string;
    goalId: number;
}

export type GoalListItemResponseAdd = GoalListItem | null;


export type GoalListItemArgUpdate = Pick<GoalListItem, 'id'>
    & Partial<Pick<GoalListItem, 'name' | 'description' | 'archive'>>;

export type GoalListItemResponseUpdate = GoalListItem | null;

export type GoalListItemArgDelete = number;

export type GoalListItemResponseDelete = boolean;


export type GoalListItemArgFetch = {
    goalId: number;
}

export type GoalListItemResponseFetch = GoalListItem[];