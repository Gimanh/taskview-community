<template>
    <!-- <motion.div
        :initial="{ x: 20, }"
        :in-view="{ x: 0,}"
        :exit="{ x: 50, opacity: 0, scale: 0.95 }"
        :transition="{duration: .2, delay: 0.001, type:'spring'}"
    > -->
    <RouterLink
        :to="routeData"
        class="task-item flex cursor-pointer shadow-md rounded-tv10 p-2 bg-task-item-bg"
    >
        <div class="task-item__left mr-2 flex flex-col items-center gap-2">
            <TvCheckbox
                v-model="checkModel"
                @click.stop="updateStatus"
            />
            <VIcon
                :icon="getPriorityIcon(task.priorityId)"
                :class="checkboxTaskPriorityClasses(task)"
                size="20"
            />
        </div>
        <div class="task-item__right flex-grow overflow-hidden">
            <span class="text-base font-medium text-left mt-[2px] line-clamp-2 box text-ellipsis">{{ task.description }}</span>
            <div
                class="task-item-main__info flex flex-wrap ga-1 mt-2"
            >
                <TDateChip
                    v-if="task.startDate || task.endDate"
                    :completed="task.complete"
                    :date-start="task.startDate"
                    :date-end="task.endDate"
                    format="short"
                    show-word
                />
                 
                <TProjectName>{{ goalsStore.goalMap.get(props.task.goalId)?.name }}</TProjectName>

                <TListName v-if="listName">
                    {{ listName }}
                </TListName>

                <TAssignedUsers
                    v-if="task.assignedUsers.length > 0"
                    :users="task.assignedUsers.map(id => collaborationStore.userMap.get(id)?.email!)"
                />

                <TMoney
                    v-if="task"
                    :task="task"
                />

                <div class="flex flex-wrap gap-1">
                    <template
                        v-for="tagId in task.tags"
                        :key="tagId"
                    >
                        <VChip
                            v-if="tagsStore.tagsMap.get(tagId)?.name"
                            :color="tagsStore.tagsMap.get(tagId)?.color"
                            :text="tagsStore.tagsMap.get(tagId)?.name"
                            label
                            variant="tonal"
                            size="small"
                            class="rounded-md h-7"
                        />
                    </template>
                </div>
            </div>
        </div>
    </RouterLink>
    <!-- </motion.div> -->
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import TvCheckbox from '@/components/Common/TvCheckbox.vue';
// import { motion } from 'motion-v'
import { checkboxTaskPriorityClasses, getPriorityIcon } from '@/components/tv-ui/helpers/checkbox-task-priority';
import TAssignedUsers from '@/components/tv-ui/TAssignedUsers.vue';
import TDateChip from '@/components/tv-ui/TDateChip.vue';
import TListName from '@/components/tv-ui/TListName.vue';
import TMoney from '@/components/tv-ui/TMoney.vue';
import TProjectName from '@/components/tv-ui/TProjectName.vue';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useGoalsStore } from '@/stores/goals.store';
import { useTagsStore } from '@/stores/tag.store';
import { useTasksStore } from '@/stores/tasks.store';
import { ALL_TASKS_LIST_ID, type TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem; emitEvent?: boolean }>();
const emit = defineEmits<(e: 'update:task-status', data: { status: boolean; taskId: TaskItem['id'] }) => void>();

const tagsStore = useTagsStore();
const taskStore = useTasksStore();
const checkModel = ref(props.task.complete);
const goalListStore = useGoalListsStore();
const goalsStore = useGoalsStore();
const collaborationStore = useCollaborationStore();

watchEffect(() => {
    // //FIXME когда переключаемся между списками это работает but we need it in
    // situation when we change prop in UI and got different state from server (permissions restrict and other reasons)
    checkModel.value = props.task.complete;
});

// const hasInfo = computed(() => props.task.endDate || props.task.startDate || props.task.tags.length > 0);
const routeData = computed(() => ({
    name: 'goal-list-tasks-task',
    params: {
        goalId: props.task.goalId,
        listId: props.task.goalListId || ALL_TASKS_LIST_ID,
        taskId: props.task.id,
    },
}));

const listName = computed(() =>
    props.task?.goalListId ? goalListStore.listMap.get(props.task?.goalListId)?.name : ''
);

//FIXME we need use one store for this operation
async function updateStatus() {
    if (props.emitEvent) {
        emit('update:task-status', {
            status: !(props.task as TaskItem).complete,
            taskId: props.task.id,
        });
        return;
    }
    await taskStore.updateTaskCompleteStatus(
        {
            complete: !(props.task as TaskItem).complete,
            id: props.task.id,
            // parentId: (props.task as TaskItem).parentId,
        },
        true
    );
}
</script>
