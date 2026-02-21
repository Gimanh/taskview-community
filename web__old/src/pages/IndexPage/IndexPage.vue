<template>
    <div class="justify-center d-flex align-center index-page-container start-page-height">
        <v-btn
            v-if="!showLoader"
            :to="{ name: 'login' }"
            size="x-large"
            color="red-lighten-1"
        >
            {{ $t('msg.login') }}
        </v-btn>
        <RouterView :key="$route.fullPath" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { redirectToUser } from '@/helpers/app-helper';
import { useUserStore } from '@/stores/user.store';
import { useI18n } from 'vue-i18n';

const userStore = useUserStore();
const router = useRouter();
const showLoader = ref(true);
const $t = useI18n().t;
onMounted(async () => {
    if (userStore.isLoggedIn) {
        await redirectToUser(router);
    }
    setTimeout(() => {
        showLoader.value = false;
    }, 500);
});
</script>
