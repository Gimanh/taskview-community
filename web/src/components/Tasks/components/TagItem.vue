<template>
    <v-chip
        :ripple="true"
        label
        class="ma-2"
        @click="emit('tagSelected', props.tag.id)"
    >
        <template #prepend>
            <v-icon start>
                {{ mdiTag }}
            </v-icon>
        </template>
        {{ props.tag.name }}
        <template
            v-if="editMode"
            #append
        >
            <div style="width: 24px" />
            <v-icon
                class=""
                @click.prevent.stop="deleteTag"
            >
                {{ mdiDeleteOutline }}
            </v-icon>
            <v-icon
                class="ml-3"
                @click.prevent.stop="editTag"
            >
                {{ mdiPencilOutline }}
            </v-icon>
        </template>
    </v-chip>
</template>
<script setup lang="ts">
import { mdiDeleteOutline, mdiPencilOutline, mdiTag } from '@mdi/js';
import type { TagItem } from '@/types/tags.types';

const props = defineProps<{ tag: TagItem; editMode: boolean }>();
const emit = defineEmits<{
    (e: 'tagSelected', id: TagItem['id']): void;
    (e: 'deleteTag', id: TagItem): void;
    (e: 'editTag', id: TagItem['id']): void;
}>();

async function deleteTag() {
    emit('deleteTag', props.tag);
}

function editTag() {
    emit('editTag', props.tag.id);
}
</script>
