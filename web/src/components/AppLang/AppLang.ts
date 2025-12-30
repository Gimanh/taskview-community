import { mdiWeb } from '@mdi/js';
import { defineComponent, type WritableComputedRef } from 'vue';
import type { AppLanguages } from '@/helpers/AppTypes';
import { $ls } from '@/plugins/axios';
import { useI18n } from 'vue-i18n';

const APP_LANG_KEY = 'appLang';

export default defineComponent({

    data():{
        $t: (key: string) => string;
        locale: WritableComputedRef<string, string>;
        selected: number;
        items: { id: string; title: string }[];
        mdiWeb: string;
    } {
        const { t: $t, locale } = useI18n();
        return {
            selected: 0,
            items: [
                { id: 'ru', title: 'Русский' },
                { id: 'en', title: 'English' },
            ],
            mdiWeb,
            $t, locale,
        };
    },
    async created() {
        const lang = (await $ls.getValue(APP_LANG_KEY)) || navigator.language;
        const locale = this.localeExist(lang);
        if (locale) {
            this.setLang(locale);
        } else {
            this.setLang(this.items[1]);
        }
    },
    methods: {
        setLang(item: AppLanguages[0]) {
            this.locale = item.id;
            // this.$i18n.setLocale( item.id );
            $ls.setValue(APP_LANG_KEY, item.id);
            for (const k in this.items) {
                if (this.items[k].id === item.id) {
                    this.selected = +k;
                }
            }

            //@ts-expect-error need rewrite to composition api
            this.$vuetify.locale.current = item.id;
        },

        localeExist(locale: string) {
            return this.items.find((value) => {
                return value.id === locale;
            });
        },
    },
});
