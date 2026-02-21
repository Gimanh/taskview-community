<template>
    <v-card
        v-if="archivedLists.length > 0"
        class="rad10 d-flex align-center pt-2 pb-2 pl-3 pr-3"
        @click="expandModel = !expandModel"
    >
        <div class="mr-2">
            <v-icon> {{ mdiArchiveOutline }} </v-icon>
        </div>
        <div class="txt-subtitle-2 flex-grow-1">
            {{ $t('msg.archive') }}
        </div>
        <div>
            <v-icon> {{ expandIcon }} </v-icon>
        </div>
    </v-card>

    <transition
        name="expand"
        @enter="enter"
        @leave="leave"
    >
        <div
            v-if="expandModel"
            class="pl-3 pr-3 d-flex flex-column ga-2"
        >
            <template
                v-for="list in archivedLists"
                :key="list.id"
            >
                <GoalListItem
                    :list="list"
                    @show-actions="showActions"
                />
            </template>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { mdiArchiveOutline, mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { computed, ref } from 'vue';
import { GoalListItem } from '@/components/GoalLists/components/GoalListItem';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import type { GoalListEventMoreMenu } from '@/types/goal-lists.types';
import { useI18n } from 'vue-i18n';

const storage = useGoalListsStore();
const expandModel = ref(true);
const archivedLists = computed(() => storage.lists.filter((list) => list.archive === 1));
const emits = defineEmits<(e: 'showActions', d: GoalListEventMoreMenu) => void>();
const expandIcon = computed(() => (expandModel.value ? mdiChevronUp : mdiChevronDown));
const { t: $t } = useI18n();
function showActions(event: GoalListEventMoreMenu) {
    emits('showActions', event);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enter(el: any) {
    el.style.height = '0px';
    //eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = 'hidden';
    setTimeout(() => {
        el.style.overflow = '';
        el.style.height = 'auto';
    }, 305);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leave(el: any) {
    el.style.height = `${el.scrollHeight}px`;
    //eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight; // Trigger reflow
    el.style.height = '0px';
    el.style.overflow = 'hidden';
}
</script>

<style scoped>
/* Анимация высоты при появлении и исчезновении */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
}
.expand-enter-from,
.expand-leave-to {
    height: 0;
}
</style>
