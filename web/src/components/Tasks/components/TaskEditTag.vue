<template>
    <v-dialog
        v-model="dialog"
        :fullscreen="isMobile"
        :width="isMobile ? undefined : '400px'"
        persistent
    >
        <template #activator="{ props: activatorProps }">
            <v-chip
                v-bind="activatorProps"
                label
                class="ma-2"
            >
                <template #prepend>
                    <v-icon>
                        {{ mdiTagPlusOutline }}
                    </v-icon>
                </template>
            </v-chip>
        </template>

        <v-card>
            <v-card-text>
                <div style="display: flex; flex-direction: column">
                    <v-text-field
                        ref="input"
                        v-model="tagName"
                        v-bind="$attrs"
                        :loading="loading"
                        :placeholder="$t('task.addTag')"
                        :append-inner-icon="inputIcon"
                        variant="solo"
                        hide-details
                        spellcheck="false"
                        @keyup.enter="updateTag"
                        @click:append-inner="updateTag"
                    />
                    <v-color-picker
                        v-model="color"
                        :swatches="colorData.swatches"
                        :modes="['rgba', 'hex']"
                        mode="hex"
                        class="ma-2"
                        style="align-self: center"
                        show-swatches
                    />
                    <!-- FIXME we always add tag to project no cross-project tags -->
                    <!-- <v-checkbox
                        v-model="onlyForProject"
                        :label="$t('msg.tagForProject')"
                    /> -->
                </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn
                    :disabled="!tagName.trim()"
                    @click="updateTag"
                >
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
import { mdiKeyboardReturn, mdiKeyboardVariant, mdiTagPlusOutline } from '@mdi/js';
import type { GoalItem, TagItemArgUpdate } from 'taskview-api';
import { type ComponentPublicInstance, computed, reactive, ref, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useTagsStore } from '@/stores/tag.store';
import type { TagItem } from '@/types/tags.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ tagId: TagItem['id']; goalId: GoalItem['id'] }>();
const emit = defineEmits<{ (e: 'updateTag', tag: TagItemArgUpdate): void; (e: 'cencel'): void }>();
const $t = useI18n().t;
const tagsStore = useTagsStore();
const tag = tagsStore.tags.find((tg) => tg.id === props.tagId);

if (!tag) {
    throw new Error('Can not find tag for edition');
}

const onlyForProject = ref(!!tag?.goalId);

const tagName = ref('');
const color = ref('');
const loading = ref(false);
const dialog = ref(true);
const input = ref<ComponentPublicInstance>();
const display = useDisplay();
const colorData = reactive({
    swatches: [
        ['#007F73', '#4CCD99', '#FFC700'],
        ['#FA7070', '#008DDA', '#41C9E2'],
        ['#FF407D', '#FFCAD4', '#40679E'],
        ['#7F27FF', '#FF8911', '#74E291'],
        ['#219C90', '#D83F31', '#F94C10'],
    ],
});

const isMobile = computed(() => display.sm.value || display.xs.value);
const inputIcon = computed(() => (tagName.value.trim() ? mdiKeyboardReturn : mdiKeyboardVariant));

if (tag) {
    tagName.value = tag.name;
    color.value = tag.color;
    if (tag.goalId) {
        onlyForProject.value = true;
    }
}

function updateTag() {
    if (tag) {
        emit('updateTag', {
            ...tag,
            name: tagName.value.trim(),
            color: color.value.trim(),
            goalId: props.goalId,
        });
    }
}

watch(
    dialog,
    (val) => {
        if (val) {
            setTimeout(() => {
                input.value?.$el.querySelector('input')?.focus();
            }, 100);
        }
    },
    { immediate: true }
);
</script>
