<template>
    <v-dialog
        v-model="dialog"
        :fullscreen="!isDesktop"
        :width="isDesktop ? DIALOG_WIDTH : undefined"
        :persistent="isDesktop"
        :height="isDesktop ? '50%' : '100%'"
        scrollable
        transition="slide-x-reverse-transition"
    >
        <template #activator="{ props: activatorProps }">
            <slot
                name="activator"
                v-bind="activatorProps"
            />
        </template>
        <v-card style="background: rgb(var(--v-theme-background))">
            <v-card-text class="tv-start-mob align-center">
                <div class="tv-start-mob__wrapper w100">
                    <div class="tv-text-h3 tv-start-mob__title d-flex justify-center mb-9">
                        {{ t('msg.createNewProject') }}
                    </div>
                    <v-text-field
                        v-model="projectName"
                        :label="t('msg.projectName')"
                        :placeholder="t('msg.projectName')"
                        :rules="rules"
                        autofocus
                        validate-on="blur"
                        color="primary"
                        variant="solo"
                        hide-details
                        spellcheck="false"
                        class="mb-4 h56 fz16 rad10-v-field"
                    />

                    <v-btn
                        v-if="!isDesktop"
                        color="primary"
                        elevation="0"
                        class="tv-start-mob__add w100 mb-4 h56 fz16 rad10 fw700"
                        @click="addGoal"
                    >
                        {{ t('msg.add') }}
                    </v-btn>
                    <v-btn
                        v-if="!isDesktop"
                        color="secondary"
                        class="w100 h56 fz16 rad10 fw700"
                        @click="dialog = false"
                    >
                        {{ t('msg.cancel') }}
                    </v-btn>
                    <StructureText />
                </div>
            </v-card-text>
            <v-card-actions v-if="isDesktop">
                <v-btn
                    color="secondary"
                    class="h56 fz16 rad10 fw700"
                    @click="dialog = false"
                >
                    {{ t('msg.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    elevation="0"
                    class="h56 fz16 rad10 fw700"
                    @click="addGoal"
                >
                    {{ t('msg.add') }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useGoalsStore } from '@/stores/goals.store';
import { DIALOG_WIDTH } from '@/types/base-screen.types';
import { ALL_TASKS_LIST_ID } from '@/types/tasks.types';
import StructureText from './StructureText.vue';

const props = withDefaults(
    defineProps<{ activeOnStart?: boolean; redirectAfterAdding?: boolean; isDesktop?: boolean }>(),
    {
        activeOnStart: true,
        redirectAfterAdding: true,
        isDesktop: false,
    }
);
const { t } = useI18n();
const router = useRouter();
const dialog = ref(props.activeOnStart);
const storage = useGoalsStore();
const projectName = ref('');
const rules = computed(() => [(v: string) => !!v.trim() || t('msg.requiredField')]);

async function addGoal() {
    if (projectName.value.trim()) {
        const result = await storage.addGoal({ name: projectName.value });
        projectName.value = '';
        if (props.redirectAfterAdding && result) {
            redirectToBaseScreen();
        }
        dialog.value = false;
    } else {
        alert(t('msg.requiredField'));
    }
}

function redirectToBaseScreen() {
    router.push({ name: 'goal-list-tasks', params: { goalId: storage.goals[0].id, listId: ALL_TASKS_LIST_ID } });
}
</script>

<style lang="scss">
.tv-start-mob {
    display: flex;

    &__title {
        text-align: center;
        //margin-bottom: 53px;
    }

    &__add {
        color: #fff !important;
        font-weight: 700 !important;
    }
}
</style>
