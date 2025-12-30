<template>
    <v-dialog
        v-model="dialog"
        :width="width"
    >
        <template #activator="{ props: lProps }">
            <v-list-item v-bind="lProps">
                <v-list-item-title>{{ $t('msg.delete') }}</v-list-item-title>
            </v-list-item>
        </template>

        <v-card>
            <v-card-title>
                {{ $t('msg.deletion') }}
            </v-card-title>
            <v-card-text>
                {{ $t('msg.statusDeletion') }}
            </v-card-text>
            <v-card-actions>
                <v-btn
                    variant="text"
                    @click="dialog = false"
                >
                    {{ $t('msg.cancel') }}
                </v-btn>
                <v-btn
                    variant="text"
                    @click="deleteStatus"
                >
                    {{ $t('msg.ok') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useDialogWidth } from '@/composition/useDialogWidth';
import { useKanbanStore } from '@/stores/kanban.store';
import type { KanbanColumnItem } from 'taskview-api';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ status: KanbanColumnItem }>();
const store = useKanbanStore();
const dialog = ref(false);
const width = useDialogWidth();
const { t: $t } = useI18n();
async function deleteStatus() {
    await store.deleteStatus({ id: props.status.id });
    dialog.value = false;
}
</script>