<template>
    <v-dialog
        v-model="dialog"
        transition="dialog-bottom-transition"
        scrollable
        fullscreen
        style="background: rgb(var(--v-theme-background))"
        @after-leave="closeDialog"
    >
        <v-card
            v-if="canViewDetailDialog"
            :key="task?.id"
            class="tv-task-dialog"
            elevation="0"
            style="background: rgb(var(--v-theme-background))"
        >
            <v-card-actions>
                <v-card class="rad10 d-flex flex-grow-1 items-center">
                    <v-btn
                        icon
                        color="primary"
                        @click="closeDialog"
                    >
                        <template #default>
                            <v-icon>
                                {{ mdiArrowLeft }}
                            </v-icon>
                        </template>
                    </v-btn>
                    
                    <!-- <TaskBreadcrumbs
                        v-if="task"
                        :goal-id="task?.goalId"
                        :list-id="listId"
                    /> -->

                    <v-spacer />
                    <v-btn
                        v-if="task && canDeleteTask"
                        icon
                        color="red-lighten-1"
                        @click="deleteTask"
                    >
                        <template #default>
                            <v-icon>
                                {{ mdiDeleteOutline }}
                            </v-icon>
                        </template>
                    </v-btn>
                </v-card>
            </v-card-actions>
            <v-card-text class="pa-4">
                <div class="d-flex flex-column ga-4">
                    <TaskEditItem
                        v-if="task"
                        :task="task"
                        @toggle-expand="isSubtaskExpanded = $event"
                    />

                    

                    <TaskSubtasksSection
                        v-if="task"
                        :task="task"
                        :list-id="listId"
                        :expand="isSubtaskExpanded"
                    />

                    <TaskAssignUser
                        v-if="task"
                        :task="task"
                    />

                    <TaskDeadline
                        v-if="task"
                        :task="task"
                    />

                    <TaskPriority
                        v-if="task && canWatchTaskPriority"
                        :task="task"
                    />
                    <!-- ADD CHECK PERMISSION -->
                    <MTaskNote
                        v-if="task"
                        :task-id="task.id"
                        :note="task.note"
                    />

                    <TaskTags
                        v-if="task"
                        :goal-id="goalListStore.currentGoalId"
                        :task="task"
                        @tag-selected="toggleTag($event)"
                    />

                    <TaskChangeList 
                        v-if="task"
                        :task="task"
                    />
                    
                    <TaskChangeStatus 
                        v-if="task"
                        :task="task"
                    />

                    <TaskMoneySection
                        v-if="task"
                        :task="task" 
                    />

                    <TaskHistory
                        v-if="task"
                        :task-id="task.id"
                    />
                </div>
            </v-card-text>
            <v-divider />
        </v-card>
        <v-card v-else>
            <v-card-text>
                <v-alert
                    v-if="showForbiddenSection"
                    type="warning"
                >
                    You cannot view the task details form. Access denied.
                </v-alert>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import { mdiArrowLeft, mdiDeleteOutline } from '@mdi/js';
import MTaskNote from '@/components/Molecules/MTaskNote.vue';
import TaskAssignUser from '@/components/Tasks/components/TaskAssignUser.vue';
import TaskDeadline from '@/components/Tasks/components/TaskDeadline.vue';
import TaskEditItem from '@/components/Tasks/components/TaskEditItem.vue';
import TaskHistory from '@/components/Tasks/components/TaskHistory.vue';
import TaskPriority from '@/components/Tasks/components/TaskPriority.vue';
import TaskSubtasksSection from '@/components/Tasks/components/TaskSubtasksSection.vue';
import TaskTags from '@/components/Tasks/components/TaskTags.vue';
import TaskChangeList from '../TaskChangeList.vue';
import TaskChangeStatus from '../TaskChangeStatus.vue';
import TaskMoneySection from '../TaskMoneySection/TaskMoneySection.vue';
import { useTaskDialog } from './useTaskDialog';

const {
    dialog,
    canDeleteTask,
    canViewDetailDialog,
    canWatchTaskPriority,
    closeDialog,
    deleteTask,
    isSubtaskExpanded,
    showForbiddenSection,
    task,
    toggleTag,
    goalListStore,
    listId,
} = useTaskDialog();
</script>
