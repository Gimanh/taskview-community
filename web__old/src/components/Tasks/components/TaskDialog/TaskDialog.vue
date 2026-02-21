<template>
    <TaskDialogMob
        v-if="isMobile.isMobile.value"
    />
    <TaskDialogDesk
        v-else
    />
</template>

<script setup lang="ts">
import TaskDialogDesk from '@/components/Tasks/components/TaskDialog/TaskDialogDesk.vue';
import TaskDialogMob from '@/components/Tasks/components/TaskDialog/TaskDialogMob.vue';
import { useMobile } from '@/composition/useMobile';

const isMobile = useMobile();
</script>
