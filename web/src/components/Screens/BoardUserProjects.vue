<template>
    <BasePageDialog
        v-model="model"
        @back="$router.push({ name: 'user' })"
    >
        <template #header>
            <span class="tv-text-h3"> {{ $t('msg.goals') }} </span>
        </template>

        <div class="pa-4">
            <ProjectItem
                v-for="goal in goalsStore.goals"
                :key="goal.id"
                :goal="goal"
                :user-id="tokenData?.userData.id"
            />
        </div>

        <template #actions>
            <MainScreenAddGoalDialog
                :active-on-start="false"
                :redirect-after-adding="false"
            >
                <template #activator="data">
                    <v-btn
                        v-bind="data"
                        :prepend-icon="mdiPlus"
                        color="primary"
                        variant="tonal"
                        class="mb-4 h56 fz16 rad10 fw700 w100"
                    >
                        {{ $t('msg.addGoal') }}
                    </v-btn>
                </template>
            </MainScreenAddGoalDialog>
        </template>
    </BasePageDialog>
</template>

<script setup lang="ts">
import { mdiPlus } from '@mdi/js';
import { ref } from 'vue';
import BasePageDialog from '@/components/Screens/BasePageDialog.vue';
import ProjectItem from '@/components/Screens/components/ProjectItem.vue';
import MainScreenAddGoalDialog from '@/components/Screens/MainScreenAddGoalDialog.vue';
import type { JWTPayload } from '@/helpers/AppTypes';
import { parseJwt } from '@/helpers/Helper';
import { useGoalsStore } from '@/stores/goals.store';
import { useUserStore } from '@/stores/user.store';
import { useI18n } from 'vue-i18n';

const userStore = useUserStore();
const goalsStore = useGoalsStore();
const tokenData = parseJwt<JWTPayload>(userStore.accessToken);
const model = ref(true);
const $t = useI18n().t;
</script>
