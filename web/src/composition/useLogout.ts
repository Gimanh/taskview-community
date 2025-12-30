import type { LogoutResponse } from '@/components/Authentication/LoginForm/Types';
import $api from '@/helpers/axios';
import { $ls } from '@/plugins/axios';

export async function logout() {
    await $api.post<LogoutResponse>('/module/auth/logout').catch((err) => {
        console.log(err, $api);
    });
    await $ls.invalidateTokens();
}
