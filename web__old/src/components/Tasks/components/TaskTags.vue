<template>
    <v-card
        v-if="canViewTaskTags"
        class="rad10"
    >
        <v-card-text
            v-if="tagsStore.filteredTags.length > 0"
            class="pa-1"
        >
            <template v-if="canViewTaskTags">
                <TagItem
                    v-for="tag in tagsStore.filteredTags"
                    :key="tag.id"
                    :edit-mode="editMode"
                    :tag="tag"
                    :color="getColor(tag)"
                    @tag-selected="emit('tagSelected', $event)"
                    @delete-tag="showDeleteTagDialog"
                    @edit-tag="showEditTagDialog"
                />
            </template>
            <TaskDeleteTag
                v-if="canEditTaskTags && showDelete && deletionTag"
                :tag-name="deletionTag['name']"
                @agree="deleteTag"
                @cencel="cancelDeletion"
            />
            <TaskEditTag
                v-if="canEditTaskTags && showEdit && editTagId !== -1"
                :tag-id="editTagId"
                :goal-id="goalId"
                @update-tag="updateTag"
                @cencel="cancelEdition"
            />
        </v-card-text>
        <v-divider v-if="canEditTaskTags && tagsStore.filteredTags.length > 0" />
        <v-card-actions
            v-if="canEditTaskTags"
            class="pa-0"
        >
            <TaskAddTag
                :goal-id="goalId"
                @edit="editMode = !editMode"
                @add="editMode = false"
            />
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
import type { GoalItem, TagItemArgUpdate } from 'taskview-api';
import { ref } from 'vue';
import TagItem from '@/components/Tasks/components/TagItem.vue';
import TaskAddTag from '@/components/Tasks/components/TaskAddTag.vue';
import TaskDeleteTag from '@/components/Tasks/components/TaskDeleteTag.vue';
import TaskEditTag from '@/components/Tasks/components/TaskEditTag.vue';
import { useGoalPermissions } from '@/composition/useGoalPermissions';
import { useTagsStore } from '@/stores/tag.store';
import type { TagItem as TagItemT } from '@/types/tags.types';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem; goalId: GoalItem['id'] }>();
const emit = defineEmits<(e: 'tagSelected', id: TagItemT['id']) => void>();
const tagsStore = useTagsStore();
const editMode = ref(false);
const showDelete = ref(false);
const showEdit = ref(false);
let deletionTag: TagItemT | undefined;
let editTagId: TagItemT['id'] | -1 = -1;
const { canEditTaskTags, canViewTaskTags } = useGoalPermissions();

function getColor(tag: TagItemT) {
    const index = props.task.tags.indexOf(tag.id);
    if (index !== -1) {
        return tag.color;
    }
    return '';
}

function cancelDeletion() {
    deletionTag = undefined;
    showDelete.value = false;
}

function showDeleteTagDialog(tagId: TagItemT) {
    deletionTag = tagId;
    showDelete.value = true;
}

function showEditTagDialog(tagId: TagItemT['id']) {
    editTagId = tagId;
    showEdit.value = true;
}

function cancelEdition() {
    editTagId = -1;
    showEdit.value = false;
}

async function deleteTag() {
    if (deletionTag) {
        await tagsStore.deleteTag(deletionTag.id);
        cancelDeletion();
    }
}

async function updateTag(newTag: TagItemArgUpdate) {
    if (editTagId !== -1) {
        await tagsStore.updateTag(newTag);
        cancelEdition();
    }
}
</script>
