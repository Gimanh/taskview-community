import type { GoalItem } from 'taskview-api'
import { TvPermissions } from 'taskview-api'

export const DEFAULT_GOAL_ITEM: GoalItem = {
  id: -1,
  name: '',
  description: '',
  color: '',
  owner: -1,
  permissions: {},
  archive: 0,
  dateCreation: null,
  organizationId: null,
  estimateUnit: 'points',
  isInbox: false,
}

export const AllGoalPermissions = TvPermissions

export type GoalsStoreState = {
    initialized: boolean;
    loading: boolean;
    selectedItemId: GoalItem['id'];
    goals: GoalItem[];
    /** Inbox of the user's personal organization, loaded while another organization is open */
    personalInbox: GoalItem | null;
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
