import type { GoalItem } from 'taskview-api';
import { TvPermissions } from 'taskview-api';

export const DEFAULT_GOAL_ITEM: GoalItem = {
    id: -1,
    name: '',
    description: '',
    color: '',
    owner: -1,
    permissions: {},
    archive: 0,
    dateCreation: null,
};

export const AllGoalPermissions = TvPermissions;

export type GoalsStoreState = {
    loading: boolean;
    selectedItemId: GoalItem['id'];
    goals: GoalItem[];
};

export type GoalEventMoreMenu = {
    activator: HTMLElement;
    goal: GoalItem;
};

export type GoalActionsItemsEvents =
    | 'editGoal'
    | 'deleteGoal'
    | 'archiveGoal'
    | 'callCollaboration'
    | 'noItems'
    | 'editList'
    | 'deleteList'
    | 'archiveGoalList'
    | 'kanbanView'
    | 'graphView';
export type GoalActionsItems = {
    id: number;
    name: string;
    eventName: GoalActionsItemsEvents;
    icon?: string;
    disabled?: boolean;
}[];
