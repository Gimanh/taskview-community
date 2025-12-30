<template>
    <v-app-bar
        :clipped-left="true"
        fixed
        app
        elevation="2"
        location="bottom"
    >
        <div class="flex w-full h-full items-center justify-between overflow-auto gap-1">
            <div
                v-for="item in actionsForRouteScope"
                :key="item.icon"
                class="flex-1 flex flex-col items-center justify-center h-full min-w-2 gap-1"
                @click="buttonHandler(item.to)"
            >
                <v-icon
                    :icon="APP_ICONS[item.icon]"
                    :color="isActiveButton(item.to) ? COLOR_TV_MAIN : undefined"
                    size="25"
                />
                <span
                    :style="{color: isActiveButton(item.to) ? COLOR_TV_MAIN : undefined}"
                    class="h-5 w-full text-center truncate text-[14px]"
                >  
                    {{ item.text }} 
                </span>
            </div>
        </div>
    </v-app-bar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { type RouteLocationRaw, useRoute, useRouter } from 'vue-router';
import { useTaskView } from '@/composition/useTaskView';
import { APP_ICONS, COLOR_TV_MAIN } from '@/helpers/app-helper';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';

const route = useRoute();
const router = useRouter();
const taskView = useTaskView();
const { t } = useI18n();

export type AppIconKey = keyof typeof APP_ICONS;

const routes: Record<string, RouteLocationRaw> = {
    dashboard: { name: 'user' },
    collaboration: { name: 'project-collaboration-page' },
    kanban: { name: 'kanban' },
    lists: { name: 'goal-lists' },
    analytics: { name: 'user-analytics' },
    users: { name: 'user-projects-users' },
    projects: { name: 'user-projects' },
    tasks: { name: 'goal-list-tasks', params: { listId: ALL_TASKS_LIST_ID } },
    graph: { name: 'user-graph' },
};

const actionsForRouteScope = computed<{ to: RouteLocationRaw; icon: AppIconKey; text: string }[]>(() => {
    if (taskView.showProjectHelpers.value) {
        return [
            { to: routes.dashboard, icon: 'dashboard', text: t('msg.dashboard') },
            { to: routes.graph, icon: 'graph', text: t('msg.graph') },
            { to: routes.kanban, icon: 'kanban', text: t('msg.kanban') },
            { to: routes.lists, icon: 'lists', text: t('msg.lists') },
            { to: routes.tasks, icon: 'tasks', text: t('msg.allTasks') },
        ];
    } else {
        return [
            { to: routes.analytics, icon: 'analytics', text: t('msg.analytics') },
            { to: routes.users, icon: 'users', text: t('admin.users') },
            { to: routes.projects, icon: 'projects', text: t('msg.goals') },
        ];
    }
});

async function buttonHandler(route: RouteLocationRaw) {
    await router.push(route);
}

function isActiveButton(to: RouteLocationRaw): boolean {
    // const resolved = router.resolve(to)
    // return resolved.name === route.name

    if (typeof to === 'object' && 'name' in to && route.name) {
        return to.name === route.name;
    }
    return false;
}
</script>