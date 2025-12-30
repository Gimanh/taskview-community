import { mdiArrowLeft } from '@mdi/js';
import qs from 'qs';
import { defineComponent } from 'vue';
import type { FormFieldRules, RecoveryRequestResponse } from '@/helpers/AppTypes';
import { useI18n } from 'vue-i18n';
import $api from '@/helpers/axios';

export default defineComponent({
    data():{ $t: (key: string) => string, 
        url: string;
        email: string;
        valid: boolean;
        emailSent: boolean;
        sent: boolean;
        mdiArrowLeft: string;
     } {
        const { t: $t } = useI18n();
        return {
            url: '/module/auth/email/recovery',
            email: '',
            valid: false,
            emailSent: false,
            sent: false,
            mdiArrowLeft,
            $t,
        };
    },
    computed: {
        emailLabel(): string {
            return this.$t('msg.email') as string;
        },
        emailRule(): FormFieldRules {
            return [
                (email: string) => {
                    const re =
                        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                    return re.test(String(email).toLowerCase()) || (this.$t('msg.requiredField') as string);
                },
            ];
        },
        alertInfo(): string {
            return this.sent
                ? (this.$t('msg.checkEmail') as string)
                : (this.$t('msg.sendRecoveryEmailError') as string);
        },
        alertType(): 'info' | 'warning' {
            return this.sent ? 'info' : 'warning';
        },
    },
    methods: {
        emitCancel(): void {
            //eslint-disable-next-line vue/require-explicit-emits
            this.$emit('cancelRecovery');
        },
        showInfo() {
            this.emailSent = true;
            setTimeout(
                () => {
                    this.emailSent = false;
                    this.emitCancel();
                },
                this.sent ? 2000 : 3000
            );
        },
        async submit(): Promise<void> {
            if (await (this.$refs.form as { validate: () => Promise<boolean> }).validate()) {
                const result = await $api
                    .post<RecoveryRequestResponse>(this.url, qs.stringify({ email: this.email }))
                    .catch((err) => console.log(err));
                if (result) {
                    this.sent = result.data.sent;
                    this.showInfo();
                } else {
                    this.sent = false;
                    this.showInfo();
                }
            }
        },
    },
});
