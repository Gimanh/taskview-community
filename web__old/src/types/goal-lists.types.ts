import type { GoalItem, GoalListItem } from 'taskview-api';
// import type { GoalItem } from './goals.types';

/** @deprecated use GoalListItem[] from taskview-api instead */
export type GoalListItems = GoalListItem[];

export type GoalListsStoreState = {
    currentGoalId: GoalItem['id'];
    lists: GoalListItem[];
    loading: boolean;
};

// /** @deprecated */
// export type GoalListAddArg = {
//     goalId: number;
//     name: string;
// };

// /** @deprecated */
// export type GoalListAddResponse = {
//     add: boolean;
//     component?: GoalListItem;
// };

export type GoalListEventMoreMenu = {
    activator: HTMLElement;
    list: GoalListItem;
};

export type GoalListActionsItemsEvents = 'editList' | 'deleteList' | 'archiveGoalList';

export type GoalListActionsItems = {
    id: number;
    name: string;
    eventName: GoalListActionsItemsEvents;
    icon?: string;
}[];

// export type GoalListDeleteResponse = {
//     delete: boolean;
// };

// export type GoalListUpdateArg = {
//     id: number;
//     name: string;
// };

// export type GoalListUpdateResponse = {
//     update: boolean;
//     component?: GoalListItem;
// };

// export type ArchiveListArg = { goalListId: GoalListItem['id']; archive: GoalListItem['archive'] };
// export type ArchiveListResp = { archive: 0 | 1 };
export type GoalSectionsTabs = 'tasks' | 'lists';
