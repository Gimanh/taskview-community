<template>
    <v-list
        v-model:opened="open"
        lines="one"
        density="compact"
    >
        <!-- <v-list-subheader>{{ $t('msg.settings') }}</v-list-subheader> -->
        <AppLang>
            <template #activator="{ props }">
                <v-list-item
                    v-bind="props"
                    :title="t('msg.locale')"
                >
                    <template #prepend>
                        <v-icon>
                            {{ mdiWeb }}
                        </v-icon>
                    </template>
                </v-list-item>
            </template>
        </AppLang>
        <ThemeSwitcher />
        <Account>
            <template #activator="{ activatorProps }">
                <v-list-item
                    :title="t('msg.settings')"
                    v-bind="activatorProps"
                >
                    <template #prepend>
                        <v-icon>
                            {{ mdiCardAccountDetailsOutline }}
                        </v-icon>
                    </template>
                </v-list-item>
            </template>
        </Account>
        <v-list-item
            :title="t('msg.logout')"
            @click="logoutFromApp"
        >
            <template #prepend>
                <v-icon>
                    {{ mdiExitToApp }}
                </v-icon>
            </template>
        </v-list-item>
        <v-list-item
            class="text-gray-500"
            @click.prevent="checkForUpdates"
        >
            v {{ version }}{{ prodOrDev === 'dev' ? '_d' : '' }}
        </v-list-item>
    </v-list>
</template>

<script setup lang="ts">
import { mdiCardAccountDetailsOutline, mdiExitToApp, mdiWeb } from '@mdi/js';
import { defineAsyncComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Account from '@/components/User/Account.vue';
import ThemeSwitcher from '@/components/UserUiUtils/ThemeSwitcher.vue';
import { logout } from '@/composition/useLogout';
import { useUpdater } from '@/composition/useUpdater';
import { $ls } from '@/plugins/axios';

const version = APP_VERSION;
const router = useRouter();
const AppLang = defineAsyncComponent(() => import('@/components/AppLang'));
const open = ref<string[]>(['ui-utils']);
const { t } = useI18n();
const prodOrDev = ref<'prod' | 'dev'>('prod');
let counter = 0;
let timeout: number;
let timeoutChangeProdOrDev: number;

onMounted(async () => {
    prodOrDev.value = (await $ls.getValue('update_loading')) === 'dev' ? 'dev' : 'prod';
});

async function logoutFromApp() {
    const result = await logout();
    if (result) {
        await router.push('/');
        router.go(0);
    }
}

async function checkForUpdates() {
    counter++;

    if (timeout) clearTimeout(timeout);
    if (timeoutChangeProdOrDev) clearTimeout(timeoutChangeProdOrDev);
    timeout = window.setTimeout(() => {
        counter = 0;
    }, 500);

    if (counter === 7) {
        timeoutChangeProdOrDev = window.setTimeout(async () => {
            if ((await $ls.getValue('update_loading')) !== 'dev') {
                await $ls.setValue('update_loading', 'dev');
                prodOrDev.value = 'dev';
            } else {
                await $ls.setValue('update_loading', 'prod');
                prodOrDev.value = 'prod';
            }
            console.log(await $ls.getValue('update_loading'));
            await useUpdater(true);
            clearTimeout(timeoutChangeProdOrDev);
        }, 2000);
    }
}
</script>
