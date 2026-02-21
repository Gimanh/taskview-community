import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useKanbanStore } from '@/stores/kanban.store';
import { useTasksStore } from '@/stores/tasks.store';
import type { TagItem } from '@/types/tags.types';

export function useTaskDialog() {
    const isSubtaskExpanded = ref(true);
    const dialog = ref(true);
    const router = useRouter();
    const route = useRoute();
    const tasksStorage = useTasksStore();
    const taskId = +route.params.taskId;
    const kanbanStore = useKanbanStore();
    const { canEditTaskStatus, canDeleteTask, canViewTaskDetails, canViewTaskPriority } = useGoalPermissions();

    watch(
        () => dialog.value,
        (v) => {
            if (!v) tasksStorage.selectedTask = null;
        }
    );

    if (!tasksStorage.selectedTask || tasksStorage.selectedTask.id !== taskId) {
        tasksStorage.fetchTaskById(taskId).then(() => {
            if (tasksStorage.selectedTask) {
                kanbanStore.fetchStatuses(tasksStorage.selectedTask?.goalId);
            }
        });
    }

    const task = computed(() => tasksStorage.selectedTask);
    const display = useDisplay();
    const isMobile = computed(() => display.sm.value || display.xs.value);
    const goalListStore = useGoalListsStore();
    const showForbiddenSection = ref(false);

    async function closeDialog() {
        await router.back();
    }

    async function toggleTag(tagId: TagItem['id']) {
        if (task.value) {
            const arg = { taskId: task.value.id, tagId };
            await tasksStorage.toggleTagForTask(arg);
        }
    }

    async function deleteTask() {
        const answer = confirm('Do you want delete task?');
        if (answer) {
            if (task.value) {
                await tasksStorage.deleteTask(task.value.id);
                await closeDialog();
            }
        }
    }

    async function updateTaskStatus() {
        if (task.value) {
            await tasksStorage.updateTaskCompleteStatus(
                { id: task.value.id, complete: !task.value.complete, parentId: task.value.parentId },
                false
            );
        }
    }

    onMounted(() => {
        setTimeout(() => {
            showForbiddenSection.value = true;
        }, 700);
    });

    return {
        isSubtaskExpanded,
        dialog,
        task,
        isMobile,
        showForbiddenSection,
        canChangeStatus: canEditTaskStatus,
        canDeleteTask: canDeleteTask,
        canViewDetailDialog: canViewTaskDetails,
        canWatchTaskPriority: canViewTaskPriority,
        closeDialog,
        toggleTag,
        deleteTask,
        updateTaskStatus,
        goalListStore,
        listId: +route.params.listId,
    };
}
