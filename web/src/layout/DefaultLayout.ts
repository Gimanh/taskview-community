import { mdiInvertColors } from '@mdi/js';
import { defineAsyncComponent, defineComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import { goToLoginPage, isLoggedIn } from '@/helpers/app-helper';
import { $ls } from '@/plugins/axios';
import { useAppStore } from '@/stores/app.store';

const AppLogo = defineAsyncComponent(() => import('@/components/AppLogo'));
const AppLang = defineAsyncComponent(() => import('@/components/AppLang'));

const AppLogout = defineAsyncComponent(() => import('@/components/Authentication/Logout'));

export default defineComponent({
    components: {
        AppLogo,
        AppLang,
        AppLogout,
    },
    setup() {
        const theme = useTheme();
        const router = useRouter();
        const appStore = useAppStore();

        async function restoreTheme() {
            const themeValue = await $ls.getValue('theme');
            if (themeValue) {
                theme.global.name.value = themeValue;
            }
        }

        return {
            isLoggedIn,
            mdiInvertColors,
            goToLoginPage: () => goToLoginPage(router),
            toggleTheme: () => {
                theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
            },
            appStore,
            restoreTheme,
        };
    },

    created() {
        this.restoreTheme();
    },
});
