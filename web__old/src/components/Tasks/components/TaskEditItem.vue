<template>
    <div class="tv-edit-task">
        <v-textarea
            v-model="model"
            :rows="1"
            :clear-icon="mdiClose"
            :max-rows="20"
            :append-inner-icon="expandSubtasks"
            :readonly="!canEditTaskDescription"
            spellcheck="false"
            auto-grow
            hide-details
            variant="solo"
            class="rad10-v-field"
            @update:model-value="updateTaskDescription"
            @click:append-inner="$emit('toggleExpand', (isExpanded = !isExpanded))"
        >
            <template #prepend-inner>
                <!-- <v-checkbox-btn
                    v-model="checkModel"
                    :readonly="!canEditTaskStatus"
                    @update:model-value="updateTaskStatus"
                    @click.stop
                /> -->
                <TvCheckbox
                    v-model="checkModel"
                    :readonly="!canEditTaskStatus"
                    
                    class="m-2"
                    @update:model-value="updateTaskStatus"
                    @click.stop
                />
            </template>
        </v-textarea>
    </div>
</template>

<script setup lang="ts">
import { mdiChevronDown, mdiChevronUp, mdiClose } from '@mdi/js';
import { computed, ref } from 'vue';
import TvCheckbox from '@/components/Common/TvCheckbox.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { debounce } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem }>();
defineEmits<(e: 'toggleExpand', val: boolean) => void>();
const checkModel = ref(props.task.complete);
const { canEditTaskStatus, canEditTaskDescription, canViewTaskSubtasks } = useGoalPermissions();
const storage = useTasksStore();
const model = ref(props.task.description);
const isExpanded = ref(true);

const expandSubtasks = computed(() => {
    if (!canViewTaskSubtasks.value) {
        return undefined;
    }
    if (props.task.subtasks.length === 0) {
        return undefined;
    }
    return isExpanded.value ? mdiChevronUp : mdiChevronDown;
});

const updateTaskDescription = debounce(async (description: string) => {
    if (description) {
        await storage.updateTaskDescription({ id: props.task.id, description });
    }
}, 1500);

async function updateTaskStatus(complete: boolean) {
    await storage.updateTaskCompleteStatus({ 
        id: props.task.id,
        complete,
        // parentId: props.task.parentId 
    }, false);
}
</script>
