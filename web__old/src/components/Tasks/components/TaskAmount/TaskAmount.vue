<template>
    <div>
        <v-text-field
            ref="input"
            v-model="amount"
            type="number"
            :label="label"
            :prepend-inner-icon="APP_ICONS.money"
            :placeholder="t('task.amount')"
            :rules="rules"
            class="w100 rad10-v-field"
            variant="solo"
            hide-details
            spellcheck="false"
            @change="debouncedSave"
            @update:focused="selectAmount"
        />
    </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { VTextField } from 'vuetify/components';
import { APP_ICONS, debounce } from '@/helpers/app-helper';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const props = defineProps<{ task: TaskItem }>();
const REG = /^\d+(?:[.]\d{1,2})?$/;
const { t } = useI18n();
const tasksStore = useTasksStore();
const input = ref<InstanceType<typeof VTextField> | null>();
const amount = ref<null | string>(null);

const message = ref('');

watch(
    () => props.task.amount,
    (v) => {
        amount.value = v?.toString() || null;
    },
    { immediate: true }
);

const label = computed(() => (`${message.value}` ? `${message.value} 12 | 14.10` : undefined));
const rules = computed(() => [
    (v: string) => {
        if (!v) {
            message.value = '';
            return true;
        }
        if (REG.test(v)) {
            message.value = '';
            return true;
        }
        message.value = t('msg.onlyNumbers');
        return message.value;
    },
]);

const saveAmount = async () => {
    if (!amount.value) {
        await tasksStore.updateTaskAmount({ id: +props.task.id, amount: null });
    }

    if (amount.value && !REG.test(amount.value.toString())) return;
    await tasksStore.updateTaskAmount({ id: +props.task.id, amount: amount.value ? +amount.value : null });
};

const debouncedSave = debounce(saveAmount, 600);

const selectAmount = (e: boolean) => {
    if (!e) return;
    nextTick(() => input.value?.$el.querySelector('input')?.select());
};
</script>