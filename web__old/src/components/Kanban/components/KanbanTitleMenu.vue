<template>
    <v-menu v-model="menu">
        <template #activator="{props:lProps}">
            <v-btn
                v-bind="lProps"
                icon
                variant="text"
            >
                <v-icon>
                    {{ mdiDotsHorizontal }}
                </v-icon>
            </v-btn>
        </template>
        <v-list @click="menu = false">
            <KanbanTitleEdit
                :status="props.status"
            />
            <KanbanDelete :status="props.status" />
        </v-list>
    </v-menu>
</template>

<script setup lang="ts">
import { mdiDotsHorizontal } from '@mdi/js';
import { ref } from 'vue';
import KanbanDelete from './KanbanDelete.vue';
import KanbanTitleEdit from './KanbanTitleEdit.vue';
import type { KanbanColumnItem } from 'taskview-api';

const props = defineProps<{ status: KanbanColumnItem }>();
const menu = ref(false);
</script>