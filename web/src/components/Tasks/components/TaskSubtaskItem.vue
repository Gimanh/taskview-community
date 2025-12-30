<template>
    <v-textarea
        v-model="model"
        :autofocus="lastAddedTask === task.id"
        variant="solo"
        hide-details
        rows="1"
        auto-grow
        class="rad10-v-field tv-subtask__item"
        @update:model-value="updateDescription"
    >
        <template #prepend-inner>
            <v-checkbox-btn
                :model-value="task.complete"
                :true-icon="mdiCheckCircleOutline"
                :false-icon="mdiCheckboxBlankCircleOutline"
                class="tv-subtask-input"
                inline
                hide-details
                @update:model-value="updateTaskStatus"
                @click.stop
            />
        </template>

        <template #append-inner>
            <v-btn
                icon
                size="small"
                elevation="0"
                @click.stop="deleteSubtask"
            >
                <v-icon>
                    {{ mdiDeleteOutline }}
                </v-icon>
            </v-btn>
            <!-- <v-menu class="rad10">
                <template v-slot:activator="{ props }">
                    <v-icon :icon="mdiDotsHorizontal" v-bind="props" style="height: 24px" />
                </template>

                <v-list class="tv-subtask-actions">
                   <v-list-item :title="$t('msg.open')" :prepend-icon="mdiFolderOpenOutline" @click="moveToTask" /> 
                    <v-list-item :prepend-icon="mdiDeleteOutline" class="pl-3" @click.stop="deleteSubtask">
                        {{ $t('msg.delete') }}</v-list-item
                    >
                </v-list>
            </v-menu> -->
        </template>
    </v-textarea>
</template>

<script setup lang="ts">
import { mdiCheckboxBlankCircleOutline, mdiCheckCircleOutline, mdiDeleteOutline } from '@mdi/js';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { debounce } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem; lastAddedTask: number; parentTask: TaskItem }>();

const { t } = useI18n();
const tasksStore = useTasksStore();
const model = ref(props.task.description);

watch(
    () => props.task.description,
    (v) => {
        console.log('subtasks updated', v);
        model.value = props.task.description;
    },
    { immediate: true }
);

const updateDescription = debounce(async (description: string) => {
    await tasksStore.updateTaskDescription({ id: props.task.id, description });
}, 500);

async function updateTaskStatus(complete: boolean) {
    console.log(complete);
    await tasksStore.updateTaskCompleteStatus({ id: props.task.id, complete, parentId: props.task.parentId }, false);
}

async function deleteSubtask() {
    const result = confirm(t('task.deleteQuestion'));
    if (result) {
        const r = await tasksStore.deleteTask(props.task.id);
        if (r) {
            //FIXME maybe we need move it to store but if we have recursive??? it is not hard to delete it
            const i = props.parentTask.subtasks.findIndex((t) => t.id === props.task.id);
            if (i !== -1) {
                // FIXME
                // eslint-disable-next-line vue/no-mutating-props
                props.parentTask.subtasks.splice(i, 1);
            }
        }
    }
}

// function moveToTask() {
//     router.push({ name: 'goal-list-tasks-task', params: { taskId: props.task.id } });
// }
</script>
