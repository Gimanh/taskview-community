<template>
    <div class="justify-center d-flex align-center start-page-height">
        <Suspense>
            <AppCredentialsForm />
        </Suspense>
    </div>
</template>

<script setup lang="ts">
import { AppCredentialsForm } from '@/components/Authentication/AppCredentialsForm';
import { useRoute, useRouter } from 'vue-router';
import { $ls } from '@/plugins/axios';
import { onMounted } from 'vue';
import type { LoginResponse } from '@/components/Authentication/LoginForm/Types';
import { redirectToUser } from '@/helpers/app-helper';
import { App } from "@capacitor/app";
import { Browser } from '@capacitor/browser';
import $api from '@/helpers/axios';

const router = useRouter();
const route = useRoute();

type LoginTokens = {
    code: string;
    email: string;
};

onMounted(async () => {
    try{
        const tokens = route.query.tokens as string;
        
        if(!tokens){
            return;
        }

        const result = JSON.parse(decodeURIComponent(tokens)) as LoginTokens;
        await loginByCode(result.code, result.email);
    }catch(error){
        console.error(error);
    }
});


App.addListener("appUrlOpen", async ({ url }) => {
    if (!url) {
        return;
    }

    if (url.startsWith("taskview://login?tokens")) {
        const parsed = new URL(url);
        const tokens = parsed.searchParams.get("tokens");

        if(!tokens){
            return;
        }

        try{
            const result = JSON.parse(decodeURIComponent(tokens)) as LoginTokens;
            await loginByCode(result.code, result.email);
        }catch(error){
            console.error(error);
        }
    }

    await Browser.close();
});

const loginByCode = async (code: string, email: string) => {
    const result = await $api.post<LoginResponse>('/module/auth/login-by-code', { code, email });
    if (result && result.data.access) {
        $ls.setToken(result.data.access);
        $ls.setRefreshToken(result.data.refresh);
        await $ls.updateUserStoreByToken();
        await redirectToUser(router);
    }
}
</script>
