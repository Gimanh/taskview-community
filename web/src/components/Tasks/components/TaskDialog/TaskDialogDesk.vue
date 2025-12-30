<template>
    <v-dialog
        v-model="dialog"
        :width="'80%'"
        transition="dialog-bottom-transition"
        scrollable
        @after-leave="closeDialog"
    >
        <v-card
            v-if="canViewDetailDialog"
            :key="task?.id"
            class="tv-task-dialog rad10"
            elevation="0"
            style="background: rgb(var(--v-theme-background))"
        >
            <v-toolbar class="pl-3">
                <div class="tv-text-h3 txt-center mr-3">
                    {{ $t('msg.task') }}
                </div>
            </v-toolbar>
            <v-card-text class="pa-10">
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

                    <v-divider class="mb-5 mt-5" />

                    <!-- ADD CHECK PERMISSION -->
                    <MTaskNote
                        v-if="task"
                        :task-id="task.id"
                        :note="task.note"
                    />
                    <v-row>
                        <v-col class="gap-5 flex flex-col w-1/2">
                            <TaskDeadline
                                v-if="task"
                                :task="task"
                            />
                            <TaskAssignUser
                                v-if="task"
                                :task="task"
                            />
                        </v-col>
                        <v-col class="gap-5 flex flex-col w-1/2">
                            <TaskPriority
                                v-if="task && canWatchTaskPriority"
                                :task="task"
                            />

                            <TaskTags
                                v-if="task"
                                :goal-id="goalListStore.currentGoalId"
                                :task="task"
                                @tag-selected="toggleTag($event)"
                            />
                        </v-col>
                    </v-row>

                    <v-row>
                        <v-col class="gap-5 flex flex-col w-1/2">
                            <TaskChangeList 
                                v-if="task"
                                :task="task"
                            />
                        </v-col>
                        <v-col class="gap-5 flex flex-col w-1/2">
                            <TaskChangeStatus 
                                v-if="task"
                                :task="task"
                            />
                        </v-col>
                    </v-row>

                    <TaskMoneySection
                        v-if="task"
                        :task="task" 
                    />

                    <TaskHistory
                        v-if="task"
                        :is-desktop="true"
                        :task-id="task.id"
                    />
                </div>
            </v-card-text>
            <v-divider />
            <v-card-actions>
                <v-spacer />
                <!-- <TaskCopyId /> -->
                <v-btn
                    v-if="task && canDeleteTask"
                    color="red-lighten-1"
                    @click="deleteTask"
                >
                    <template #default>
                        {{ $t('msg.delete') }}
                    </template>
                    <template #prepend>
                        <v-icon>
                            {{ mdiDeleteOutline }}
                        </v-icon>
                    </template>
                </v-btn>

                <v-btn
                    color="primary"
                    @click="closeDialog"
                >
                    <template #default>
                        {{ $t('msg.close') }}
                    </template>
                    <template #prepend>
                        <v-icon>
                            {{ mdiClose }}
                        </v-icon>
                    </template>
                </v-btn>
            </v-card-actions>
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
import { mdiClose, mdiDeleteOutline } from '@mdi/js';
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
import { useI18n } from 'vue-i18n';

const $t = useI18n().t;

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

<style lang="scss" scoped>
.tv-subtask {
    padding-left: 15% !important;
}
</style>
