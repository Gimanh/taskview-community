import { mdiExitToApp } from '@mdi/js';
import { defineComponent } from 'vue';
import type { LogoutResponse } from '@/components/Authentication/LoginForm/Types';
import { logError } from '@/helpers/app-helper';
import $api from '@/helpers/axios';
import { $ls } from '@/plugins/axios';

export default defineComponent({
    data() {
        return {
            mdiExitToApp,
        };
    },
    methods: {
        async logout() {
            const result = await $api.post<LogoutResponse>('/module/auth/logout').catch(logError);
            if (result) {
                if (result.data.logout) {
                    $ls.invalidateTokens();
                    await this.$router.push('/');
                }
            }
        },
    },
});
