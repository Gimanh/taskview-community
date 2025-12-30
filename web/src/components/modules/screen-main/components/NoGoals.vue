<template>
    <div
        v-if="noGoals"
        class="text-center p-5 rounded-md w-full"
    >
        <div class="text-center bg-task-item-bg px-5 py-2 opacity-50 text-sm font-normal">
            {{ $t('msg.addFirstProject') }}
        </div>
        <GoalAdd />
    </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import GoalAdd from '@/components/Goals/components/GoalAdd/GoalAdd.vue';
import { useGoalsStore } from '@/stores/goals.store';
import { useI18n } from 'vue-i18n';

const goalsStore = useGoalsStore();
const { t: $t } = useI18n();
const noGoals = computed(() => goalsStore.goals.filter((g) => !g.archive).length === 0);
</script>