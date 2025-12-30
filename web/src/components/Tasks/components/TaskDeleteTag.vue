<template>
    <v-dialog
        v-model="dialog"
        :width="isMobile ? '100%' : '400px'"
    >
        <v-card>
            <v-card-title>
                {{ $t('task.deleteTagTitle') }}
            </v-card-title>
            <v-card-text>
                {{ $t('task.deleteTagQuestion') }}
                <v-chip label>
                    <template #prepend>
                        <v-icon start>
                            {{ mdiTag }}
                        </v-icon>
                    </template>
                    {{ props['tagName'] }}
                </v-chip>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn @click="emit('agree')">
                    {{ $t('msg.ok') }}
                </v-btn>
                <v-btn @click="emit('cencel')">
                    {{ $t('msg.cancel') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script setup lang="ts">
import { mdiTag } from '@mdi/js';
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import type { TagItem } from '@/types/tags.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ tagName: TagItem['name'] }>();
const emit = defineEmits<{ (e: 'agree'): void; (e: 'cencel'): void }>();
const dialog = ref(true);
const display = useDisplay();
const isMobile = computed(() => display.sm.value || display.xs.value);
const $t = useI18n().t;
</script>
