<template>
    <v-card class="project-users-item mb-3 pa-2">
        <div class="project-users-item__title txt-subtitle-2 d-flex align-center">
            <span style="flex-grow: 1">
                {{ users.name }}
            </span>

            <RouterLink
                :to="{ name: 'project-collaboration-page', params: { goalId: users.id } }"
                style="color: inherit"
            >
                <v-icon
                    class="cursor"
                    size="small"
                >
                    {{ mdiPencilOutline }}
                </v-icon>
            </RouterLink>
        </div>
        <div
            v-if="users.users.length > 0"
            class="project-users-item__users pt-3"
        >
            <v-list-item
                v-for="user in users.users"
                :key="user.id"
                class="project-users-item__user txt-subtitle-2"
            >
                <template #prepend>
                    <v-avatar
                        :color="getColor()"
                        class="tv-ava-color"
                    >
                        {{ user.email.slice(0, 2).toUpperCase() }}
                    </v-avatar>
                </template>
                {{ user.email }}
            </v-list-item>
        </div>
    </v-card>
</template>
<script setup lang="ts">
import { mdiPencilOutline } from '@mdi/js';
import type { BaseScreenState } from '@/types/base-screen.types';

defineProps<{ users: BaseScreenState['users'][number] }>();

function getColor() {
    return `hsl(${360 * Math.random()},${25 + 70 * Math.random()}%,${85 + 10 * Math.random()}%)`;
}
</script>

<style lang="scss">
.project-users-item {
    display: block;
    box-shadow: 0px -1px 2px 0px #00000014 inset;
    box-shadow: 0px 1px 4px 0px #0000001f inset;
    border-radius: 8px;

    &__title {
        box-shadow: 0px 1px 2px 0px #00000033;
        padding: 10px 10px 10px 12px;
        border-radius: 5px;
    }
}
</style>
