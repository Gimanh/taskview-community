import { mdiEye, mdiEyeOff } from '@mdi/js';
import qs from 'qs';
import { defineComponent } from 'vue';
import type { FormFieldRules, RegistrationResult } from '@/helpers/AppTypes';
import { validLogin } from '@/helpers/Helper';
import PasswordHelper from '@/helpers/PasswordHelper';
import { useI18n } from 'vue-i18n';
import $api from '@/helpers/axios';

export default defineComponent({
    data():{ $t: (key: string) => string, 
        url: string;
        login: string;
        email: string;
        password: string;
        passwordRepeat: string;
        valid: boolean;
        passwordType: 'password' | 'text';
        passwordRepeatType: 'password' | 'text';
        registrationResponse: { registration: boolean; confirmEmail: boolean };
        showAlert: boolean;
        termAccepted: boolean;
        checkInProcess: boolean;
        loginAlreadyExists: boolean;
     } {
        const { t: $t } = useI18n();
        return {
            url: '/module/auth/registration',
            login: '',
            email: '',
            password: '',
            passwordRepeat: '',
            valid: false,
            passwordType: 'password', // 'password' | 'text'
            passwordRepeatType: 'password', //'password' | 'text'
            registrationResponse: {
                registration: false,
                confirmEmail: false,
            },
            showAlert: false,
            termAccepted: true,
            checkInProcess: false,
            loginAlreadyExists: false,
            $t,
        };
    },
    computed: {
        isAccepted(): boolean {
            return this.termAccepted;
        },

        passwordIcon(): string {
            return this.passwordType === 'password' ? mdiEye : mdiEyeOff;
        },

        passwordRepeatIcon(): string {
            return this.passwordRepeatType === 'password' ? mdiEye : mdiEyeOff;
        },

        alertType(): 'success' | 'warning' {
            return this.registrationResponse.registration ? 'success' : 'warning';
        },

        messageRegistration(): string {
            if (this.registrationResponse.registration) {
                return this.$t('msg.registrationSuccess') as string;
            }
            return this.$t('msg.registrationError') as string;
        },

        confirmMessage(): string {
            if (this.registrationResponse.confirmEmail) {
                return this.$t('msg.confirmEmail') as string;
            }
            return '';
        },

        credentialsRules(): FormFieldRules {
            return [
                (v: string) => !!v || (this.$t('msg.requiredField') as string),
                (v: string) => {
                    return PasswordHelper.check(v) || (this.$t('msg.passwordStrength') as string);
                },
            ];
        },

        passwordRepeatRule(): FormFieldRules {
            return [
                (v: string) => v === this.password || (this.$t('msg.requiredField') as string),
                (v: string) => {
                    return PasswordHelper.check(v) || (this.$t('msg.passwordStrength') as string);
                },
            ];
        },

        loginRules(): FormFieldRules {
            return [
                (v: string) => (!!v && validLogin(v)) || (this.$t('msg.requiredField') as string),
                (v: string) => (!!v && !this.loginAlreadyExists) || (this.$t('msg.loginExists') as string),
            ];
        },

        loginLabel(): string {
            return this.$t('msg.login') as string;
        },

        passwordLabel(): string {
            return this.$t('msg.password') as string;
        },

        emailLabel(): string {
            return this.$t('msg.email') as string;
        },

        passwordLabelRepeat(): string {
            return this.$t('msg.passwordRepeat') as string;
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
    },
    methods: {
        makeidLogin(length: number) {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < length) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
                counter += 1;
            }
            return result;
        },

        async submit(): Promise<void> {
            const { url, password, passwordRepeat, email } = this;
            const data = {
                email: email.toLowerCase(),
                login: this.makeidLogin(7).toLowerCase(),
                password,
                passwordRepeat,
            };
            const validation = await (this.$refs.form as { validate: () => Promise<boolean> }).validate();
            console.log(validation);
            if (validation) {
                const result = await $api
                    .post<RegistrationResult>(url, qs.stringify(data))
                    .catch((err: unknown) => console.log(err));
                if (result) {
                    this.registrationResponse = result.data;
                    this.showAlert = true;
                }
            }
        },

        inversePasswordType() {
            this.passwordType = this.passwordType === 'text' ? 'password' : 'text';
        },

        inversePasswordRepeatType() {
            this.passwordRepeatType = this.passwordRepeatType === 'text' ? 'password' : 'text';
        },

        termAcceptSuccessHandler() {
            this.termAccepted = true;
        },

        termAcceptCancelHandler() {
            this.termAccepted = false;
        },
    },
});
