<template>
    <v-dialog
        v-model="dialog"
        :width="width"
    >
        <template #activator="{ props: lProps }">
            <v-list-item v-bind="lProps">
                <v-list-item-title>{{ $t('msg.edit') }}</v-list-item-title>
            </v-list-item>
        </template>

        <v-card>
            <v-card-title>
                {{ $t('msg.editing') }}
            </v-card-title>
            <v-card-text>
                <v-text-field 
                    v-model="name"
                    :placeholder="$t('msg.name')"
                    hide-details
                    variant="solo"
                    class="rad10-v-field h56"
                />
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
                    @click="save"
                >
                    {{ $t('msg.save') }}
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
const name = ref(props.status.name);
const dialog = ref(false);
const width = useDialogWidth();
const { t: $t } = useI18n();
async function save() {
    await store.updateStatus({ id: props.status.id, name: name.value });
    dialog.value = false;
}
</script>