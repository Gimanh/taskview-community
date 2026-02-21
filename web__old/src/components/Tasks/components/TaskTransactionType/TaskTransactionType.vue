<template>
    <div class="h-14 flex items-center rounded-tv10 overflow-hidden shadow-md">
        <VBtnToggle
            v-model="model"
            :disabled="disabled"
            class="w-full flex h-full rounded-tv10"
            @update:model-value="updateTransactionType"
        >
            <VBtn
                v-for="transaction in transactions"
                :key="transaction.type"
                :value="transaction.type"
                class="w-1/2"
            >
                <template #prepend>
                    <VIcon
                    
                        :class="{'text-green-500':model === transaction.type}"
                    >
                        {{ mdiCheckAll }}
                    </VIcon>
                </template>
                
                {{ transaction.title }}
            </VBtn>
        </VBtnToggle>
        <!-- <v-select
            v-model="model"
            :items="transactions"
            :placeholder="$t('task.transactionType')"
            :disabled="disabled"
            clearable
            class="rad10-v-field pa-0"
            hide-details
            variant="solo"
            item-title="title"
            item-value="type"
            @update:model-value="updateTransactionType"
        >
            <template #prepend-inner>
                <div class="d-flex align-self-start">
                    <v-icon>
                        {{ mdiSwapVertical }}
                    </v-icon>
                </div>
            </template>
        </v-select> -->
    </div>
</template>

<script setup lang="ts">
import { mdiCheckAll } from '@mdi/js';
// import { mdiSwapVertical } from '@mdi/js';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { VBtnToggle } from 'vuetify/components';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem; disabled?: boolean }>();

const model = ref();
const { t } = useI18n();
const tasksStore = useTasksStore();

watch(
    () => props.task.transactionType,
    (v) => {
        model.value = v;
    },
    { immediate: true }
);

//FIXME fetch transaction types from server
const transactions = ref([
    { title: t('task.transactionIncome'), type: 1 },
    { title: t('task.transactionExpense'), type: 0 },
]);

const updateTransactionType = async () => {
    tasksStore.updateTaskTransactionType({ id: props.task.id, transactionType: model.value });
};
</script>