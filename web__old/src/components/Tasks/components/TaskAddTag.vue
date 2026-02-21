<template>
    <v-text-field
        v-model="tagName"
        :prepend-inner-icon="mdiTagOutline"
        :append-inner-icon="appendIcon"
        :placeholder="$t('task.addTag')"
        :loading="tagsStore.loading"
        :disabled="tagsStore.loading"
        class="w100"
        variant="solo"
        hide-details
        spellcheck="false"
        @change="clickAppend"
        @click:append-inner="clickAppend"
    />
</template>

<script setup lang="ts">
import { mdiPencilOutline, mdiPlus, mdiTagOutline } from '@mdi/js';
import type { GoalItem } from 'taskview-api';
import { computed, ref } from 'vue';
import { useTagsStore } from '@/stores/tag.store';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ goalId: GoalItem['id'] }>();
const emits = defineEmits(['edit', 'add']);
const $t = useI18n().t;
const tagsStore = useTagsStore();

const tagName = ref('');
const dialog = ref(false);
const colors = [
    '#FF407D',
    '#FFCAD4',
    '#40679E',
    '#7F27FF',
    '#FF8911',
    '#74E291',
    '#219C90',
    '#D83F31',
    '#F94C10',
    '#4ADBC8',
    '#AF42AE',
    '#29BF12',
    '#FFD400',
    '#D90368',
    '#5A9367',
    '#3F8EFC',
    '#7272AB',
    '#6C8EAD',
    '#B2D3A8',
    '#1A659E',
    '#EFA00B',
    '#8AC926',
    '#06D6A0',
    '#9F9FED',
    '#E65F5C',
    '#F06C9B',
    '#FF8811',
    '#8980F5',
    '#5FBFF9',
    '#F26419',
    '#5DA399',
    '#007991',
    '#DF57BC',
    '#4A4E69',
    '#753742',
    '#F21B3F',
    '#8D5A97',
    '#F34213',
    '#007F73',
    '#4CCD99',
    '#FFC700',
    '#FA7070',
    '#008DDA',
    '#41C9E2',
];

const appendIcon = computed(() => {
    if (tagName.value) {
        return mdiPlus;
    }
    return mdiPencilOutline;
});

const newTagColor = computed(() => {
    const color = getRandomElement(
        colors,
        tagsStore.tags.map((t) => t.color)
    );
    if (color) {
        return color;
    }
    return colors[Math.floor(Math.random() * colors.length)];
});

function getRandomElement(arr: string[], exclude: string[] = []) {
    // Фильтруем исходный массив, исключая элементы, которые есть в exclude
    const filteredArray = arr.filter((item) => !exclude.includes(item));

    // Если после фильтрации массив пуст, возвращаем undefined или сообщение о невозможности выбора
    if (filteredArray.length === 0) {
        return undefined; // Или, например, throw new Error('No valid elements available.');
    }

    // Выбираем случайный элемент из отфильтрованного массива
    const randomIndex = Math.floor(Math.random() * filteredArray.length);
    return filteredArray[randomIndex];
}

async function clickAppend() {
    if (tagName.value) {
        emits('add');
        addTag();
    } else {
        emits('edit');
    }
}
async function addTag() {
    if (tagsStore.loading) {
        return;
    }
    await tagsStore.addTag({
        name: tagName.value.trim(),
        color: newTagColor.value,
        goalId: props.goalId,
    });
    dialog.value = false;
    tagName.value = '';
}
</script>
