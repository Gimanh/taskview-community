<template>
    <div class="tv-nav-drawer pa-4 d-flex flex-column ga-2">
        <Suspense>
            <TvNavItem
                v-for="item in data.drawer"
                :key="item.title"
                :item="item"
            />
        </Suspense>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import TvNavItem from '@/components/ForLayout/TvNavItem.vue';
import Goals from '@/components/Goals';
import ArchivedGoals from '@/components/Goals/components/ArchivedGoals.vue';
import { APP_ICONS } from '@/helpers/app-helper';
import type { TvNavItemT } from '@/types/layout.types';

const data = computed<{
    drawer: TvNavItemT[];
}>(() => ({
    drawer: [
        { title: 'msg.dashboard', icon: APP_ICONS.dashboard, to: { name: 'user' } },
        { title: 'msg.goals', expandable: true, expanded: true, icon: APP_ICONS.projects, component: Goals },
        { title: 'admin.users', icon: APP_ICONS.users, to: { name: 'user-projects-users' } },
        {
            title: 'msg.archive',
            icon: APP_ICONS.archiveState,
            expandable: true,
            component: ArchivedGoals,
            expanded: false,
        },
    ],
}));
</script>
