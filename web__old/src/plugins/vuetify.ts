import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
import { VPullToRefresh } from 'vuetify/labs/VPullToRefresh';
import { en as vEn, ru as vRu } from 'vuetify/locale';

// import DateFnsAdapter from '@date-io/date-fns';

// import ru from 'date-fns/locale/ru';
// import en from 'date-fns/locale/en-US';
// import * as ru from 'date-fns/locale/ru';
// import * as en from 'date-fns/locale/en-US';
const vuetify = createVuetify({
    components: {
        ...components,
        VPullToRefresh,
    },
    directives,
    icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
            mdi,
        },
    },
    locale: {
        messages: {
            ru: vRu,
            en: vEn,
        },
    },
    // date: {
    //     locale: { en, ru },
    // },
    date: {
        // adapter: DateFnsAdapter,
        //     locale: {
        //         en: en,
        //         ru: ru,
        //     },
    },
});

export default vuetify;
