<template>
    <UsersByProjectMobile v-if="isMobile" />
    <UsersByProjectDesktop v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UsersByProjectDesktop from '@/components/Screens/components/ProjectUsers/UsersByProjectDesktop.vue';
import UsersByProjectMobile from '@/components/Screens/components/ProjectUsers/UsersByProjectMobile.vue';
import { useMobile } from '@/composition/useMobile';
import { useBaseScreenStore } from '@/stores/base-screen.store';

const baseScreenStore = useBaseScreenStore();
const mobile = useMobile();
const isMobile = computed(() => mobile.isMobile.value);

if (!baseScreenStore.wasCalled) {
    baseScreenStore.fetchAllState();
}
</script>
