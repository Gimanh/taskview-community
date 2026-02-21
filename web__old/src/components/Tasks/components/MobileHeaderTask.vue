<template>
    <div class="w100 d-flex ga-2 pr-2">
        <!-- <v-btn icon size="small" elevation="0">
            <v-icon size="large">
                {{ mdiArrowLeft }}
            </v-icon>
        </v-btn> -->

        <TaskSearchAdd
            :list-id="+listId"
            :density="'compact'"
            :variant="'solo-filled'"
            flat
        />
        <!-- <ToggleCompletedTasks /> -->
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TaskSearchAdd from '@/components/Tasks/components/TaskSearchAdd';

const route = useRoute();
const listId = computed<string>(() => route.params.listId as string);
</script>
