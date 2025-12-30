<template>
    <v-card
        width="400px"
        density="compact"
    >
        <div v-if="!resetPassword">
            <v-card-text>
                <LoginByCode
                    v-show="data.enterSystem === 'code'"
                    key="0"
                />
                <LoginForm
                    v-show="data.enterSystem === 'login'"
                    key="1"
                />
                <RegistrationForm
                    v-show="data.enterSystem === 'registration'"
                    key="2"
                />
                <PasswordRecovery
                    v-show="data.enterSystem === 'recovery'"
                    key="3"
                    @cancel-recovery="setRecoveryMode(false)"
                />
            </v-card-text>
            <v-divider />

            <v-card-actions
                v-if="!data.recoveryModeActive && data.enterSystem !== 'recovery'"
                class="flex flex-col"
            >
                <div class="w-full flex justify-between">
                    <v-btn @click="toggleForms">
                        {{ data.enterSystem === 'code' ? t('msg.enterWithPassword') : t('msg.enterWithCode') }}
                    </v-btn>
                    <v-spacer />
                    <v-btn @click="setRecoveryMode(true)">
                        {{ forgotPassword }}
                    </v-btn>
                </div>
            </v-card-actions>
        </div>

        <v-card-text v-if="resetPassword">
            <ResetPassword />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import LoginForm from '@/components/Authentication/LoginForm';
import PasswordRecovery from '@/components/Authentication/PasswordRecovery';
import RegistrationForm from '@/components/Authentication/RegistrationForm';
import ResetPassword from '@/components/Authentication/ResetPassword';
import LoginByCode from '../LoginByCode/LoginByCode.vue';

const data = reactive({
    recoveryModeActive: false,
    showLoginForm: true,
    enterSystem: 'code',
});

const { t } = useI18n();
const route = useRoute();

const resetPassword = computed(() => {
    return !!route.query.resetCode && !!route.query.login;
});
const forgotPassword = computed(() => {
    return t('msg.forgotPassword') as string;
});

function toggleForms() {
    data.enterSystem = data.enterSystem === 'login' ? 'code' : 'login';
}
function setRecoveryMode(value: boolean) {
    data.recoveryModeActive = value;

    if (value) {
        data.enterSystem = 'recovery';
    } else {
        data.enterSystem = 'code';
    }
}
</script>
