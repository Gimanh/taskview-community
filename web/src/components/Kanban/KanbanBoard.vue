<template>
    <div
        v-if="canViewKanban"
        ref="kanbanContainer"
        class="tv-kanban"
        @pointermove="handlePointerMove"
        @pointerleave="boardStopScrolling"
        @pointerdown="pointerDownHandler"
        @touchend="boardStopScrolling"
    >
        <div
            v-for="status in kanbanStore.statuses"
            :key="status.id"
            ref="kanbanCol"
            class="tv-kanban__col"
        >
            <v-card class="tv-kanban__col-title">
                <span class="flex-grow truncate">
                    {{ t(status.name) }}
                </span>
                <KanbanTitleMenu
                    v-if="status.id !== -1"
                    :status="status"
                />
            </v-card>

            <KanbanAddTask
                v-if="canAddTask"
                :goal-id="kanbanStore.goalId"
                :status-id="status.id"
            />

            <draggable
                v-bind="sortableOptions"
                :list="kanbanStore.tasksData[status.id]?.tasks"
                :data-column-id="status.id"
                :animation="'150'"
                class="tv-kanban__col-group"
                item-key="id"
                group="people"
                @start="startHandler"
                @end="onDragEnd"
                @clone="onClone"
                @scroll="onScrollDebounced"
                @click.capture.stop="handleTaskClickAfterDrag"
            >
                <template #item="{ element }">
                    <v-lazy
                        :data-order="element.kanbanOrder"
                        :data-task-id="element.id"
                        :options="{ 'threshold': 0.5 }"
                        transition="fade-transition"
                    >
                        <TaskItemMain
                            :task="element"
                            :delete-completed="false"
                            use-task-store
                            class="txt-no-select"
                            emit-event
                            @update:task-status="updateTaskChecked($event)"
                        />
                    </v-lazy>
                </template>
            </draggable>
            <div class="flex justify-center p-1 relative">
                <VBtn
                    v-if="canShowLoadMore[status.id] && kanbanStore.tasksData[status.id]?.nextCursor !== null"
                    size="small"
                    class="w-full absolute bottom-0.5"
                    @click="loadMoreTasks(status.id)"
                >
                    Load more
                </VBtn>
            </div>
        </div>
        <KanbanAddStatus :goal-id="kanbanStore.goalId" />
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import draggable from 'vuedraggable';
import './kanban.scss';
import type { Task } from 'taskview-api';
import { useRoute, useRouter } from 'vue-router';
import KanbanAddStatus from '@/components/Kanban/components/KanbanAddStatus.vue';
import TaskItemMain from '@/components/Tasks/components/TaskItemMain.vue';
import { useMobile } from '@/composition/useMobile';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useKanbanStore } from '@/stores/kanban.store';
import { useTagsStore } from '@/stores/tag.store';
import { useTasksStore } from '@/stores/tasks.store';
import { DEFAULT_ID } from '@/types/app.types';
import KanbanAddTask from './components/KanbanAddTask.vue';
import KanbanTitleMenu from './components/KanbanTitleMenu.vue';
import { useI18n } from 'vue-i18n';
import { debounce } from '@/helpers/app-helper';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useGoalsStore } from '@/stores/goals.store';

const collaborationStore = useCollaborationStore();
const kanbanStore = useKanbanStore();
const tasksStore = useTasksStore();
const goalListStore = useGoalListsStore();
const route = useRoute();
const tagsStore = useTagsStore();
const kanbanContainer = ref<HTMLElement>();
const kanbanCol = ref();
const router = useRouter();
const canShowLoadMore = ref<Record<number, boolean>>({});
const goalId = computed(() => route.params.goalId as string);
const goalsStore = useGoalsStore();
const { canViewKanban, canAddTask, canManageKanban } = useGoalPermissions();



// setTimeout(() => {
goalsStore.selectedItemId = +goalId.value;
// }, 6000);


const isMobile = useMobile();

const { t } = useI18n();
let boardScrollDirection: string | null = null;
let boardScrollSpeed = 3;
let boardAnimationFrameId: number | null = null;
let cloneEl: HTMLElement | null = null;
let dragStartPositionX: number | null = null;
let speedDelta = 0;
const sortableOptions = computed(() => ({
    delay: 100,
    delayOnTouchOnly: false,
    forceFallback: true,
    swapThreshold: 1,
    scroll: true,
    scrollSensitivity: 50,
    scrollSpeed: 10,
    disabled: !canManageKanban.value,
}));

const testData = reactive({
    scrollLeft: 0,
    calc: 0,
    direction: '',
    eventClass: '',
});



const setGoalId = (goalId: number) => {
    kanbanStore.goalId = goalId;
    loadAllState();
}

const loadAllState = async () => {
    await Promise.all([
        kanbanStore.fetchStatuses(kanbanStore.goalId),
        tagsStore.fetchAllTags(),
    ]);
}

const initLoadTasksForEachColumn = async () => {
    await Promise.all(kanbanStore.statuses.map((status) => {
        kanbanStore.fetchTasksForColumn(kanbanStore.goalId, status.id === -1 ? null : status.id, null);
    }));
}

watch(goalId, (lGoalId) => {
    kanbanStore.$reset();
    if(lGoalId) {
        setGoalId(+lGoalId);
    }
}, { immediate: true });

watch(
    () => kanbanStore.statuses,
    () => {
        initLoadTasksForEachColumn();
    }
);

const updateTaskChecked = async (taskItem: { status: boolean, taskId: number }) => {
    await tasksStore.updateTaskCompleteStatus({
        id: taskItem.taskId,
        complete: taskItem.status,
    });

    for(const [, value] of Object.entries(kanbanStore.tasksData)) {
        if(!value) continue;
        for(const task of value.tasks) {
            if(task.id === taskItem.taskId) {
                task.complete = taskItem.status;
                return;
            }
        }
    }
}

const loadMoreTasks = (columnId: number) => {
    console.log('loadMoreTasks', columnId);
    kanbanStore.fetchTasksForColumn(
        kanbanStore.goalId, 
        columnId, 
        kanbanStore.tasksData[columnId]?.tasks[kanbanStore.tasksData[columnId]?.tasks.length - 1]?.kanbanOrder || null
    );
    canShowLoadMore.value[columnId] = false;
};

const onScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;

    if(scrollTop === scrollHeight - clientHeight) {
        canShowLoadMore.value[target.dataset.columnId as unknown as number] = true;
    } else {
        canShowLoadMore.value[target.dataset.columnId as unknown as number] = false;
    }
};

const onScrollDebounced = debounce(onScroll, 100);

const handleTaskClickAfterDrag = (event: MouseEvent) => {
    // prevent navigation if click happened immediately after drag (in Firefox)
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
};

const startHandler = (event: MouseEvent) => {
    event.preventDefault();
};

const onClone = (evt: { clone: HTMLElement }) => {
    cloneEl = evt.clone as HTMLElement;
};

const pointerDownHandler = (event: PointerEvent) => {
    speedDelta = 0;
    dragStartPositionX = event.clientX;
};

const detectScrollDirectionFromStart = (clientX: number): 'right' | 'left' | undefined => {
    if (!dragStartPositionX) return;

    const threshold = isMobile.isMobile.value ? 80 : 240;
    const delta = clientX - dragStartPositionX;
    if (Math.abs(delta) < threshold) return;

    const percentage = (100 / threshold) * (Math.abs(delta) - threshold);

    speedDelta = ((boardScrollSpeed / 100) * Math.min(percentage, 250)) / 20;

    if (delta < 0) {
        return 'left';
    }
    return 'right';
};

const boardStopScrolling = () => {
    boardScrollDirection = null;

    if (boardAnimationFrameId) {
        cancelAnimationFrame(boardAnimationFrameId);
        boardAnimationFrameId = null;
    }
};

const handlePointerMove = (event: MouseEvent) => {
    if (!kanbanContainer.value || !cloneEl) return;
    testData.eventClass = event.constructor.name;
    detectScrollDirectionFromStart(event.clientX);

    if (detectScrollDirectionFromStart(event.clientX) === 'right') {
        boardStartScrolling('right');
    } else if (detectScrollDirectionFromStart(event.clientX) === 'left') {
        boardStartScrolling('left');
    } else {
        boardStopScrolling();
    }
};

const boardStartScrolling = (direction: 'left' | 'right') => {
    boardScrollDirection = direction;
    if (!boardAnimationFrameId) {
        boardScrollStep();
    }
};

const boardScrollStep = () => {
    if (!kanbanContainer.value || !boardScrollDirection) return;

    if (boardScrollDirection === 'right') {
        kanbanContainer.value.scrollLeft += boardScrollSpeed + speedDelta;

        testData.direction = 'right';
        testData.calc = boardScrollSpeed + speedDelta;
        testData.scrollLeft = kanbanContainer.value.scrollLeft;
    } else if (boardScrollDirection === 'left') {
        kanbanContainer.value.scrollLeft -= boardScrollSpeed + speedDelta;

        testData.direction = 'left';
        testData.calc = boardScrollSpeed + speedDelta;
        testData.scrollLeft = kanbanContainer.value.scrollLeft;
    }

    boardAnimationFrameId = requestAnimationFrame(boardScrollStep);
};

function scrollToColumn(targetColumn: HTMLElement) {
    const board = kanbanContainer.value;
    if (!board) return;
    if (targetColumn) {
        const boardRect = board.getBoundingClientRect();
        const columnRect = targetColumn.getBoundingClientRect();

        const scrollLeft =
            board.scrollLeft + (columnRect.left - boardRect.left) - board.clientWidth / 2 + columnRect.width / 2;

        board.scrollTo({
            left: scrollLeft,
            behavior: 'smooth',
        });
    }
}

async function onDragEnd(evt: {
    to: HTMLElement;
    item: HTMLElement;
    newDraggableIndex: number;
    oldDraggableIndex: number;
}) {
    cloneEl = null;
    boardStopScrolling();
    const targetColumn = evt.to as HTMLElement;

    const newColumnId = targetColumn.dataset.columnId;

    if (newColumnId === undefined) {
        console.error(`Can not find columns id in dataset for element`);
        return;
    }

    let taskId: string | number | undefined = (evt.item as HTMLElement).dataset.taskId;

    if (taskId === undefined) {
        console.log(`Can not find taskId in dataset`);
        return;
    }

    taskId = +taskId;
    const newColumnIdNum = +newColumnId;

    const columnTasks = kanbanStore.tasksData[newColumnIdNum]?.tasks ?? [];

    const activeTasks = columnTasks.filter((task: Task) => task.id !== taskId);

    const nextItemInColumn = activeTasks[evt.newDraggableIndex] || null;
    const prevItemInColumn = activeTasks[evt.newDraggableIndex - 1] || null;

    await kanbanStore.updateTasksOrderAndColumn({
        taskId,
        prevTaskId: prevItemInColumn?.id ?? null,
        nextTaskId: nextItemInColumn?.id ?? null,
        columnId: newColumnIdNum === -1 ? null : newColumnIdNum,
        goalId: kanbanStore.goalId,
    });

    if (targetColumn) {
        scrollToColumn(targetColumn);
    }
}

onMounted(() => {
    boardScrollSpeed = isMobile.isMobile.value ? 7 : 5;
});

onUnmounted(() => {
    kanbanStore.$reset();
    boardStopScrolling()
});
</script>


<style lang="scss" scoped>
:deep(.task-item-main__info) {
    @apply flex flex-col gap-1;
}
</style>