<template>
    <v-app>
        <v-app-bar
            :clipped-left="true"
            fixed
            app
            elevation="1"
            location="top"
        >
            <v-app-bar-nav-icon
                :ripple="false"
                max-height="40px"
                max-width="40px"
                variant="text"
                class="tv-nav-icon mr-2 ml-2"
                @click.stop="appStore.setDrawer(!appStore.drawer)"
            >
                <v-icon>{{ mdiMenu }}</v-icon>
            </v-app-bar-nav-icon>
            
            <MobileHeader v-if="taskView.isMobile.value" />

            <template v-else>
                <v-spacer v-if="!taskView.isMobile.value" />
                <ProjectHelperActions v-if="taskView.showProjectHelpers && $route.params.goalId" />
            </template>
        </v-app-bar>

        <AppBottomNavigationBarMobile
            v-if="taskView.isMobile.value"
        />

        <v-navigation-drawer
            v-model="appStore.drawer"
            :permanent="false"
            width="300"
            elevation="1"
            disable-resize-watcher
            class="pt-2"
            style="background: rgb(var(--v-theme-background))"
        >
            <v-pull-to-refresh
                :pull-down-threshold="56"
                class="w100"
                @load="reloadGoals"
            >
                <div
                    class="d-flex flex-column"
                    style="min-height: 100%"
                >
                    <TvNawDrawer />
                    <div class="flex-grow-1" />
                    <UserUiUtils />
                    <SocialLinks />
                </div>
            </v-pull-to-refresh>
        </v-navigation-drawer>

        <v-main>
            <v-container
                fluid
                class="ma-0 pa-0 app-main-container overflow-auto"
            >
                <slot />
            </v-container>
        </v-main>
    </v-app>
</template>
<script setup lang="ts">
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { mdiMenu } from '@mdi/js';
import { onMounted } from 'vue';
import TvNawDrawer from '@/components/ForLayout/TvNawDrawer.vue';
import MobileHeader from '@/components/MobileHeader.vue';
import AppBottomNavigationBarMobile from '@/components/Screens/components/AppBottomNavigationBarMobile.vue';
import ProjectHelperActions from '@/components/Screens/ProjectHelperActions.vue';
import SocialLinks from '@/components/SocialLinks/SocialLinks.vue';
import UserUiUtils from '@/components/UserUiUtils.vue';
import { useTaskView } from '@/composition/useTaskView';
import { useUpdater } from '@/composition/useUpdater';
import { useAppStore } from '@/stores/app.store';
import { useGoalsStore } from '@/stores/goals.store';

// Флаг для предотвращения повторных вызовов обновления
let updateInProgress = false;

/**
 * Bug fix for iPad
 * Reproduction
 * - run app
 * - hide app to nav bar
 * - open app in iPan you will detect that appNavBar disappeared and in task route you will see disappeared filter bar
 *
 * This is temporary fix
 */
App.addListener('appStateChange', async ({ isActive }) => {
    console.log('appStateChange user layout', isActive);

    if (!isActive) {
        await useUpdater(true);
    }

    if (isActive && !updateInProgress) {
        try {
            updateInProgress = true;
            await useUpdater();
        } catch (error) {
            console.error('[Update] Error in appStateChange update:', error);
        } finally {
            updateInProgress = false;
        }

        if (await isIPad()) {
            window.location.reload();
        }
    }
});

async function isIPad() {
    const info = await Device.getInfo();
    console.log(info, info.name === 'iPad');
    return info.name === 'iPad';
}

// async function isPortrait() {
//     return screen.orientation.type === 'landscape-primary';
// }

// async function isIPadPortrait() {
//     return await isIPad() && await isPortrait();
// }

const goalsStore = useGoalsStore();
const appStore = useAppStore();
const taskView = useTaskView();

onMounted(async () => {
    await CapacitorUpdater.notifyAppReady();
    console.log('notifyAppReady', APP_VERSION);

    // Проверяем обновления при запуске приложения
    try {
        console.log('[Update] Starting initial update check');
        await useUpdater();
    } catch (error) {
        console.error('[Update] Error in initial update check:', error);
    }

    if (taskView.isMobile.value) {
        appStore.setDrawer(false);
    } else {
        appStore.setDrawer(true);
    }
});

async function reloadGoals({ done }: { done: () => void }) {
    await goalsStore.fetchGoals();
    done();
}
</script>
