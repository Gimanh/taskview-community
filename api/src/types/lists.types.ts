export type ListItemInDb = {
    id: number;
    name: string;
    description: string;
    date_creation: string;
    goal_id: number;
    owner: number;
    creator_id: number;
    edit_date: string;
    archive: 0 | 1;
};
