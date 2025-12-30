import { mdiCircleSlice8 } from '@mdi/js';
import styles from '@/components/tv-ui/helpers/TaskItemUi.module.scss';
import type { TaskItem } from '@/types/tasks.types';

export const checkboxTaskPriorityClasses = (task: TaskItem) => {
    return {
        [styles.low]: task.priorityId === 1,
        [styles.medium]: task.priorityId === 2,
        [styles.high]: task.priorityId === 3,
    };
};

export const getPriorityIcon = (priorityId: number) => {
    switch (priorityId) {
        case 1:
            return mdiCircleSlice8;
        case 2:
            return mdiCircleSlice8;
        case 3:
            return mdiCircleSlice8;
    }
};
