export type FetchAllListsResult = {
    goalName: string | null;
    listName: string | null;
    listId: number | null;
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
