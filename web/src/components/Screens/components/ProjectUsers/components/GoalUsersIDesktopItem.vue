<template>
    <v-card class="project-users-item-desktop pa-2">
        <div class="project-users-item-desktop__title txt-subtitle-2 d-flex align-center">
            <span style="flex-grow: 1">
                {{ goalName }}
            </span>

            <RouterLink
                :to="{ name: 'project-collaboration-page', params: { goalId: users.id } }"
                style="color: inherit"
            >
                <v-btn
                    :icon="mdiPencilOutline"
                    size="small"
                    variant="text"
                />
            </RouterLink>

            <v-btn
                :disabled="!(users.users.length > 0)"
                :icon="expandIcon"
                size="small"
                variant="text"
                @click="isExpanded = !isExpanded"
            />
        </div>
        <div
            v-if="users.users.length > 0"
            class="project-users-item-desktop__users align-center d-flex flex-grow-1 pl-2 pt-2"
        >
            <template v-if="isExpanded">
                <div>
                    <v-list-item
                        v-for="user in users.users"
                        :key="user.id"
                        class="project-users-item__user txt-subtitle-2 pl-0"
                    >
                        <template #prepend>
                            <v-avatar
                                :color="getColor(user.id)"
                                class="tv-ava-color"
                            >
                                {{ user.email.slice(0, 2).toUpperCase() }}
                            </v-avatar>
                        </template>
                        {{ user.email }}
                    </v-list-item>
                </div>
            </template>
            <template v-else>
                <v-avatar
                    v-for="user in users.users.slice(0, 5)"
                    :key="user.id"
                    :color="getColor(user.id)"
                    class="txt-subtitle-2 project-users-item-desktop__avatar"
                >
                    {{ user.email.slice(0, 2).toUpperCase() }}
                </v-avatar>
            </template>
        </div>
    </v-card>
</template>
<script setup lang="ts">
import { mdiChevronDown, mdiChevronUp, mdiPencilOutline } from '@mdi/js';
import { computed, reactive, ref } from 'vue';
import { getPasteleColor } from '@/helpers/app-helper';
import { useGoalsStore } from '@/stores/goals.store';
import type { BaseScreenState } from '@/types/base-screen.types';

const props = defineProps<{ users: BaseScreenState['users'][number] }>();
const goalsStore = useGoalsStore();
const isExpanded = ref(false);
const expandIcon = computed(() => (isExpanded.value ? mdiChevronUp : mdiChevronDown));
const goalName = computed(() => {
    const g = goalsStore.goals.find((g) => g.id === props.users.id);
    if (g) {
        return g.name;
    }
    return props.users.name;
});
const avColor = reactive<Record<number, string>>({});

function getColor(id: number) {
    if (!avColor[id]) {
        avColor[id] = getPasteleColor();
    }
    return avColor[id];
}
</script>

<style lang="scss">
.project-users-item-desktop {
    display: block;
    box-shadow: 0px -1px 2px 0px #00000014 inset;
    box-shadow: 0px 1px 4px 0px #0000001f inset;
    border-radius: 8px;

    &__title {
        box-shadow: 0px 1px 2px 0px #00000033;
        padding: 10px 10px 10px 12px;
        border-radius: 5px;
    }

    &__avatar {
        margin-left: -6px;
    }

    &__avatar:first-child {
        margin-left: 0px;
    }
}
</style>
