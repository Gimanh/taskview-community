export type FetchAllListsResult = {
    goalName: string;
    listName: string;
    listId: number;
    goalId: number;
};

export type UsersByProjectsFromDb = {
    id: number;
    name: string;
    user: { id: number; email: string }[];
};

export type AssigneesForTaskFromDb = {
    email: string;
    taskId: number;
    collabUserId: number;
};
