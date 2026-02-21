import type { GoalListItem } from 'taskview-api'

/** @deprecated use GoalListItem[] from taskview-api instead */
export type GoalListItems = GoalListItem[];

export type GoalListsStoreState = {
    lists: GoalListItem[];
    loading: boolean;
};

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
