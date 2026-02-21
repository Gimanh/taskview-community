import { defineComponent } from 'vue';

import { AppCredentialsForm } from '@/components/Authentication/AppCredentialsForm';

export default defineComponent({
    components: {
        AppCredentialsForm,
    },
    data() {
        return {
            msg: 'login',
        };
    },
});
