import { mdiArrowLeft, mdiEye, mdiEyeOff } from '@mdi/js';
import qs from 'qs';
import { defineComponent } from 'vue';
import type { FormFieldRules, ResetPasswordResponse } from '@/helpers/AppTypes';
import { logError } from '@/helpers/app-helper';
import PasswordHelper from '@/helpers/PasswordHelper';
import { useI18n } from 'vue-i18n';
import $api from '@/helpers/axios';

export default defineComponent({
    data():{ $t: (key: string) => string, [key: string]: unknown } {
        const { t: $t } = useI18n();
        return {
            url: '/module/auth/password/reset',
            valid: false,
            password: '',
            passwordRepeat: '',
            reset: true,
            passwordType: 'password' as 'password' | 'text',
            passwordRepeatType: 'password' as 'password' | 'text',
            mdiArrowLeft,
            $t,
        };
    },
    computed: {
        passwordLabel(): string {
            return this.$t('msg.password') as string;
        },

        passwordLabelRepeat(): string {
            return this.$t('msg.passwordRepeat') as string;
        },

        passwordIcon(): string {
            return this.passwordType === 'password' ? mdiEye : mdiEyeOff;
        },

        passwordRepeatIcon(): string {
            return this.passwordRepeatType === 'password' ? mdiEye : mdiEyeOff;
        },

        passwordRules(): FormFieldRules {
            return [
                (v: string) => {
                    if (this.passwordRepeat) {
                        return v === this.passwordRepeat || (this.$t('msg.passwordsMatch') as string);
                    }
                    return true;
                },
                (v: string) => !!v || (this.$t('msg.requiredField') as string),
                (v: string) => {
                    return PasswordHelper.check(v) || (this.$t('msg.passwordStrength') as string);
                },
            ];
        },

        passwordRepeatRule(): FormFieldRules {
            return [
                (v: string) => v === this.password || (this.$t('msg.passwordsMatch') as string),
                (v: string) => {
                    return PasswordHelper.check(v) || (this.$t('msg.passwordStrength') as string);
                },
            ];
        },

        errorResetAlert(): string {
            return this.$t('msg.canNotResetPassword') as string;
        },
    },
    methods: {
        async validate() {
            await (this.$refs.form as { validate: () => Promise<boolean> }).validate();
        },
        async cancel(): Promise<void> {
            await this.$router.push('/');
        },

        async submit(): Promise<void> {
            if (await (this.$refs.form as { validate: () => Promise<boolean> }).validate()) {
                const data = {
                    code: this.$route.query.resetCode,
                    login: this.$route.query.login,
                    password: this.password,
                    passwordRepeat: this.passwordRepeat,
                };
                const result = await $api   
                    .post<ResetPasswordResponse>(this.url as string, qs.stringify(data))
                    .catch(logError);
                if (result) {
                    this.reset = result.data.reset;
                    if (this.reset) {
                        await this.cancel();
                    }
                }
            }
        },

        inversePasswordType() {
            this.passwordType = this.passwordType === 'text' ? 'password' : 'text';
        },

        inversePasswordRepeatType() {
            this.passwordRepeatType = this.passwordRepeatType === 'text' ? 'password' : 'text';
        },
    },
});
