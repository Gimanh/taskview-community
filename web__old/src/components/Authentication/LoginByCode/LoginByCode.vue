<template>
    <v-card
        class="rad10 tv-login-by-code"
        elevation="0"
    >
        <v-card-text class="px-1">
            <v-form
                v-model="valid"
                class="flex flex-column gap-5"
            >
                <v-text-field
                    v-model="email"
                    :placeholder="t('msg.email')"
                    :rules="emailRule"
                    autocomplete="email"
                    required
                    variant="solo"
                    hide-details
                    rows="1"
                    auto-grow
                    class="rad10-v-field"
                />

                <v-text-field
                    v-if="showCodeField"
                    v-model="code"
                    :placeholder="t('msg.enterCodeFromEmail')"
                    :rules="[(v:string)=>!!v && v.length > 4]"
                    autocomplete="one-time-code"
                    required
                    variant="solo"
                    hide-details
                    rows="1"
                    auto-grow
                    class="rad10-v-field"
                />

                <v-btn
                    :disabled="!valid"
                    color="#00bfff"
                    class="rad10 h56"
                    elevation="2"
                    @click="handleClick"
                >
                    {{ buttonTitle }}
                </v-btn>

                <div
                    v-if="showCodeField"
                    class="px-2 text-gray-500"
                >
                    {{ t('msg.weHaveSentCodeToEmail') }}
                </div>

                <Suspense>
                    <ServerSelection />
                </Suspense>
            </v-form>
        </v-card-text>
    </v-card>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ServerSelection from '@/components/ServerSelection.vue';
import { redirectToUser } from '@/helpers/app-helper';
import $api from '@/helpers/axios';
import { $ls } from '@/plugins/axios';

const email = ref<string | undefined>();
const code = ref<string | undefined>();
const showCodeField = ref(false);
const { t } = useI18n();
const valid = ref(false);
const router = useRouter();

const buttonTitle = computed(() => (showCodeField.value ? t('msg.login') : t('msg.sendCodeByEmail')));
const emailRule = computed(() => [
    (email: string) => {
        const re =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase()) || (t('msg.requiredField') as string);
    },
]);

onMounted(() => {
    $ls.getValue('user-email').then((mail: string | null) => {
        if (mail) {
            email.value = mail;
        }
    });
});

async function handleClick() {
    if (showCodeField.value) {
        const result = await $api
            .post('/module/auth/login-by-code', { code: code.value, email: email.value })
            .catch((err) => console.log(err));

        if (result && result.data.access) {
            $ls.setToken(result.data.access);
            $ls.setRefreshToken(result.data.refresh);
            await $ls.updateUserStoreByToken();
            await redirectToUser(router);
        }
    } else {
        if (valid.value) {
            await $api.post('/module/auth/send-login-code', { email: email.value }).catch((err) => console.log(err));
            $ls.setValue('user-email', email.value as string);
        }
        //gimanhead@gmail.com
        showCodeField.value = true;
    }
}
</script>

<style lang="scss">
.tv-login-by-code {
    .h56 {
        .v-input__control {
            height: 56px;
        }
    }
}
</style>
