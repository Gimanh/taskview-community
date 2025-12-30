<template>
    <VDialog
        v-model="dialog"
        :width="isMobile ? undefined : '400px'"
    >
        <VCard
            class="rounded-lg"
        >
            <VCardTitle>    
                {{ t('msg.addTask') }}
            </VCardTitle>
            <VCardText>
                <VTextField 
                    v-model="taskName"
                    :placeholder="t('msg.task')"
                    :rules="rules"
                    variant="solo-filled"
                    hide-details
                    spellcheck="false"
                    class="rad10-v-field"
                    density="comfortable"
                    @keyup.enter="addTask"
                />
            </VCardText>
            <VCardActions> 
                <VBtn @click="close">
                    {{ t('msg.cancel') }}
                </VBtn>
                <VBtn @click="addTask">
                    {{ t('msg.add') }}
                </VBtn>
            </VCardActions>
        </VCard>
    </VDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMobile } from '@/composition/useMobile';
import { useTasksStore } from '@/stores/tasks.store';
import type { TaskItem } from '@/types/tasks.types';

const emits = defineEmits<{
    (e: 'addTask', task: TaskItem): void;
    (e: 'close'): void;
}>();
const dialog = defineModel<boolean>('modelValue', { required: true });
const props = defineProps<{ goalId: number; nodePosition: { x: number; y: number } | undefined }>();
const { isMobile } = useMobile();
const { t } = useI18n();
const taskName = ref('');
const rules = computed(() => [(v: string) => !!v.trim() || t('msg.requiredField')]);
const store = useTasksStore();

const addTask = async () => {
    if (!props.goalId) return;
    if (!taskName.value.trim()) return;

    const task = await store.addTask({
        description: taskName.value,
        goalId: props.goalId,
        nodeGraphPosition: props.nodePosition,
    });

    if (!task) {
        alert('Can not add task');
        return;
    }

    emits('addTask', task);

    taskName.value = '';
};

const close = () => {
    taskName.value = '';
    emits('close');
};
</script>