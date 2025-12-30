<template>
    <div
        class="ga-2 align-center w100"
        style="display: flex"
    >
        <div class="flex-grow-1">
            <v-slide-x-reverse-transition leave-absolute>
                <!-- v-bind="$attrs" needs to be in bottom because we need override some props that is already assigned in component by default -->
                <v-text-field
                    v-if="canShowField"
                    v-model="taskName"
                    :loading="loading"
                    :placeholder="mode === 'add' ? $t('msg.addTask') : $t('msg.searchTask')"
                    :prepend-inner-icon="prependIcon"
                    :append-inner-icon="inputIcon"
                    :autofocus="autofocus"
                    variant="solo"
                    hide-details
                    enterkeyhint="go"
                    class="rad10-v-field"
                    density="comfortable"
                    spellcheck="false"
                    
                    v-bind="$attrs"
                    @keyup.enter="handleChanges(true)"
                    @update:model-value="handleChanges(false)"
                    @click:append-inner="handleChanges(true)"
                >
                    <template #append-inner>
                        <v-slide-x-reverse-transition>
                            <v-btn
                                v-if="taskName && mode === 'search'"
                                class="rounded-lg"
                                flat
                                variant="tonal"
                                size="small"
                                :append-icon="mdiPlus"
                                @click.stop.prevent="addTask"
                            >
                                {{ $t('msg.add') }}
                            </v-btn>
                        </v-slide-x-reverse-transition>
                    </template>
                </v-text-field>
            </v-slide-x-reverse-transition>
        </div>

        <v-btn
            icon
            variant="text"
            size="small"
            class="mt-1 mb-1"
            @click="toggleMode"
        >
            <v-icon size="large">
                {{ mode === 'add' ? mdiMagnify : mdiPlus }}
            </v-icon>
        </v-btn>
    </div>
</template>

<script setup lang="ts">
import { mdiKeyboardReturn, mdiKeyboardVariant, mdiMagnify, mdiPlus } from '@mdi/js';
import type { GoalListItem } from 'taskview-api';
import { computed, ref } from 'vue';
import { debounce } from '@/helpers/app-helper';
import { RequestQueue } from '@/helpers/RequestQueue';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { useTasksStore } from '@/stores/tasks.store';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ listId: GoalListItem['id'] }>();
const $t = useI18n().t;
const storage = useTasksStore();
const mode = ref<'search' | 'add'>('add');
const taskName = ref('');
const loading = ref(false);
const inputIcon = computed(() =>
    mode.value === 'add' ? (taskName.value.trim() ? mdiKeyboardReturn : mdiKeyboardVariant) : undefined
);
const prependIcon = computed(() => (mode.value === 'add' ? mdiPlus : mdiMagnify));
let lastSearchPhrase = '';
const canShowField = ref(true);
const autofocus = ref(false);

const debouncedSearchHandler = debounce(() => {
    if (mode.value === 'search') {
        searchHandler();
    }
}, 500);

const rq = new RequestQueue();

async function addTaskHandler() {
    rq.add(addTask);
}

async function searchHandler() {
    rq.add(fetchSearchedTasks);
}

function toggleMode() {
    mode.value = mode.value === 'search' ? 'add' : 'search';
    canShowField.value = false;
    autofocus.value = true;
    setTimeout(() => {
        canShowField.value = true;
    }, 30);
}

function handleChanges(enter: boolean) {
    if (mode.value === 'search') {
        debouncedSearchHandler();
    } else if (enter) {
        addTaskHandler();
    }
}

async function addTask() {
    if (loading.value) {
        return false;
    }

    if (taskName.value.trim()) {
        loading.value = true;

        const result = await storage.addTask({
            description: taskName.value,
            goalListId: +props.listId,
            goalId: +storage.fetchRules.goalId,
        });

        loading.value = false;

        if (result) {
            taskName.value = '';
        }

        if (lastSearchPhrase !== '') {
            await fetchSearchedTasks();
        } else {
            debouncedSearchHandler.cancel();
        }
    }

    return true;
}

async function fetchSearchedTasks() {
    if (loading.value) {
        return false;
    }

    storage.resetTasks();
    storage.updateFetchRules({
        endOfTasks: false,
        currentPage: 0,
        goalId: useGoalListsStore().currentGoalId,
        currentListId: +props.listId,
        searchText: !taskName.value.trim() ? '' : taskName.value,
    });
    lastSearchPhrase = storage.fetchRules.searchText;
    await storage.fetchTasks();
}
</script>
