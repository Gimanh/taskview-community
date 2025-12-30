<template>
    <div class="tv-kanban__col">
        <div class="w-full flex flex-col gap-3">
            <v-text-field
                v-model="statusName"
                :placeholder="$t('msg.addColumn')"
                class="h-kanban-title justify-start rounded-md tv-kanban-title-input"
                hide-details
                variant="solo"
            >
                <template #prepend-inner>
                    <v-icon>
                        {{ mdiPlus }}
                    </v-icon>
                </template>
            </v-text-field>

            <v-btn
                v-if="statusName.trim()"
                @click="addStatus"
            >
                {{ $t('msg.addColumn') }}
            </v-btn>
        </div>
    </div>
</template>
<script setup lang="ts">
import { mdiPlus } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { ref } from 'vue';
import { useKanbanStore } from '@/stores/kanban.store';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ goalId: GoalItem['id'] }>();
const { t: $t } = useI18n();
const kanbanStore = useKanbanStore();
const statusName = ref('');
async function addStatus() {
    await kanbanStore.addStatus({ goalId: props.goalId, name: statusName.value });
    statusName.value = '';
}
</script>