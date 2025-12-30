import { defineComponent } from 'vue';
// import { LoginTabs } from '@/components/Authentication/AppCredentialsForm/tabs';
import LoginForm from '@/components/Authentication/LoginForm';
import PasswordRecovery from '@/components/Authentication/PasswordRecovery';
import RegistrationForm from '@/components/Authentication/RegistrationForm';
import ResetPassword from '@/components/Authentication/ResetPassword';
import LoginByCode from '../LoginByCode/LoginByCode.vue';

export type AppCredentialsFormTabs = {
    title: string;
    component: string;
    recovery: boolean;
}[];

export default defineComponent({
    components: {
        LoginByCode,
        LoginForm,
        RegistrationForm,
        PasswordRecovery,
        ResetPassword,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data(): { [key: string]: any } {
        return {
            recoveryModeActive: false,
            tab: 'login-form',
            showLoginForm: true,
        };
    },

    computed: {
        canShowLoginForm() {
            return this.showLoginForm && !this.recoveryModeActive;
        },
        canShowRegistrationForm() {
            return !this.showLoginForm && !this.recoveryModeActive;
        },
        resetPassword(): boolean {
            return !!this.$route.query.resetCode && !!this.$route.query.login;
        },

        forgotPassword(): string {
            return this.$t('msg.forgotPassword') as string;
        },
    },

    methods: {
        setRecoveryMode(value: boolean): void {
            this.recoveryModeActive = value;
            if (value) {
                this.tab = 'password-recovery';
            }
            if (!this.recoveryModeActive) {
                this.tab = 'login-form';
            }
        },
    },
});
