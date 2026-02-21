import type { Task } from 'taskview-api'
import type { TaskItem } from '@/types/tasks.types'

export type PriorityValues = 'low' | 'medium' | 'high';
export type PriorityItem = { id: Task['priorityId']; code: PriorityValues };

export const PriorityIdToLocaleString: Record<Task['priorityId'], string> = {
  1: 'priority.low',
  2: 'priority.medium',
  3: 'priority.high',
}
export type TaskHistoryItem = TaskItem;

export type TaskHistoryState = {
    history: TaskHistoryItem[];
};
