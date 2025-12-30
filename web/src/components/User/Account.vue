<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <v-dialog
        v-model="dialog"
        transition="dialog-bottom-transition"
        fullscreen
    >
        <template #activator="{ props: activatorProps }">
            <slot
                name="activator"
                v-bind="{ activatorProps }"
            >
                <v-btn
                    prepend-icon="mdi-cog"
                    size="small"
                    text="Settings"
                    v-bind="activatorProps"
                />
            </slot>
        </template>

        <v-card class="tv-main-bg">
            <v-toolbar>
                <v-icon class="ml-3">
                    {{ mdiCardAccountDetailsOutline }}
                </v-icon>

                <v-toolbar-title>{{ t('msg.account') }}</v-toolbar-title>

                <v-spacer />

                <v-toolbar-items>
                    <v-btn
                        :text="t('msg.close')"
                        variant="text"
                        @click="dialog = false"
                    />
                </v-toolbar-items>
            </v-toolbar>

            <v-card-text>
                <v-card>
                    <v-card-title>
                        {{ t('msg.accountManagment') }}
                    </v-card-title>
                    <v-card-text>
                        <v-card class="mt-5 mb-5">
                            <v-card-text>
                                {{ useStore.email }}
                            </v-card-text>
                        </v-card>
                        <v-btn
                            color="red"
                            @click="deleteAccountQuestion"
                        >
                            {{ t('msg.deleteAccount') }}
                        </v-btn>

                        <v-dialog
                            v-model="showCodeField"
                            width="500px"
                        >
                            <v-card>
                                <v-card-text>
                                    <v-alert
                                        type="error"
                                        class="mt-3 mb-3"
                                    >
                                        {{ t('msg.delAccAlert') }}
                                    </v-alert>
                                    <v-text-field
                                        v-model="code"
                                        :label="t('msg.enterDelAccCode')"
                                        spellcheck="false"
                                    />
                                </v-card-text>
                                <v-card-actions>
                                    <v-spacer />
                                    <v-btn
                                        :disabled="!code"
                                        @click="sendDeletionRequest"
                                    >
                                        {{ t('msg.accept') }}
                                    </v-btn>
                                </v-card-actions>
                            </v-card>
                        </v-dialog>
                    </v-card-text>
                </v-card>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script setup lang="ts">
import { mdiCardAccountDetailsOutline } from '@mdi/js';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import $api from '@/helpers/axios';
import { $ls } from '@/plugins/axios';
import { useUserStore } from '@/stores/user.store';
import type { AppResponse } from '@/types/global-app.types';

const dialog = ref(false);
const showCodeField = ref(false);
const code = ref('');
const { t } = useI18n();
const router = useRouter();
const useStore = useUserStore();

async function deleteAccountQuestion() {
    const answer = confirm(t('msg.delAccQuest'));
    if (answer) {
        const result = await $api
            .get<AppResponse<{ code: boolean }>>('/module/auth/delete/account/code')
            .catch((err) => console.log(err));
        if (result && result.data.response.code) {
            showCodeField.value = true;
        } else {
            alert("We're unable to send the code. Please contact support to delete your account.");
        }
    }
}

async function sendDeletionRequest() {
    const result = await $api
        .post<AppResponse<{ del: boolean }>>('/module/auth/delete/account', { code: code.value })
        .catch((err) => console.log(err));
    if (result && result.data.response.del) {
        alert('Account deleted');
        $ls.invalidateTokens();
        router.push('/');
    }
}
</script>
