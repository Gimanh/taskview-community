<template>
    <div class="tv-user-page">
        <!-- <MainScreenAddGoalDialog v-if="goalsStore.goals.length === 0 && breakpoints.isMobile.value && !goalsStore.loading" /> -->
        <Suspense>
            <DesktopScreen v-if="canShowDesktop" />
        </Suspense>

        <!-- <RouterView :key="$route.fullPath" />  :key is cause of double render and fetch tasks commented it -->
        <RouterView />
    </div>
</template>

<script setup lang="ts">
// import MainScreenAddGoalDialog from '@/components/Screens/MainScreenAddGoalDialog.vue';

import { computed } from 'vue';
import { useRoute } from 'vue-router';
import DesktopScreen from '@/components/modules/screen-main/DesktopScreen.vue';

const $route = useRoute();
const canShowDesktop = computed(() => $route.name === 'user');
</script>
