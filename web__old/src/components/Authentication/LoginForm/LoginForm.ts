import type { AxiosError } from 'axios';
import qs from 'qs';
import { defineComponent } from 'vue';
import type { LoginResponse } from '@/components/Authentication/LoginForm/Types';
import ServerSelection from '@/components/ServerSelection.vue';
import { redirectToUser } from '@/helpers/app-helper';
import $api from '@/helpers/axios';
import { useI18n } from 'vue-i18n';
import { $ls } from '@/plugins/axios';

export default defineComponent({
    components: { ServerSelection },
    data():{ $t: (key: string) => string, 
        url: string;
        login: string;
        password: string;
        valid: boolean;
     } {
        const { t: $t } = useI18n();
        return {
            url: '/module/auth/login',
            login: '',
            //user1!#Q
            password: '',
            valid: true,
            $t,
        };
    },
    computed: {
        credentialsRules() {
            return [(v: string) => !!v || this.$t('msg.requiredField')];
        },
        loginLabel() {
            return this.$t('msg.login');
        },
        passwordLabel() {
            return this.$t('msg.password');
        },
    },
    methods: {
        async submit() {
            const { url, login, password } = this;
            const data = { login, password };
            const validation = await (this.$refs.form as { validate: () => Promise<{valid: boolean}> }).validate();
            if (validation.valid) {
                const result = await $api.post<LoginResponse>(url, qs.stringify(data)).catch((err: AxiosError) => {
                    if (err.response) {
                        if (err.response.status === 403) {
                            alert('Invalid login or password');
                        }
                    } else {
                        alert(`Bad request ${err}`);
                    }
                });
                if (result && result.data.access) {
                    $ls.setToken(result.data.access);
                    $ls.setRefreshToken(result.data.refresh);
                    await $ls.updateUserStoreByToken();
                    await redirectToUser(this.$router);
                }
            }
        },
    },
});
