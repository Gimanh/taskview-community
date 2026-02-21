<template>
    <TChipShape
        v-if="task.amount !== null"
        :class="transactionIconColor"
        class="flex items-center gap-1"
    >
        <VIcon
            :icon="mdiCurrencyUsd"
            size="16"
        />
        
        <span class="flex items-center">
            <VIcon
                :icon="transactionIcon"
                size="14"
                class="mt-0.5"
            />
            {{ amount }}
        </span>
    </TChipShape>
</template>
<script setup lang="ts">
import { mdiCurrencyUsd, mdiMinus, mdiPlus } from '@mdi/js';
import { type Task, TaskIncomeType } from 'taskview-api';
import { computed } from 'vue';
import TChipShape from '@/components/tv-ui/TChipShape.vue';

const props = defineProps<{ task: Task }>();

const transactionIcon = computed(() => (props.task.transactionType === TaskIncomeType ? mdiPlus : mdiMinus));
const transactionIconColor = computed(() =>
    props.task.transactionType === TaskIncomeType ? 'text-emerald-400' : 'text-sky-400'
);
const amount = computed(() =>
    props.task.amount
        ? new Intl.NumberFormat('ru-RU', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }).format(+props.task.amount)
        : undefined
);
</script>