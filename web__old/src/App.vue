<template>
    <component :is="layout">
        <router-view />
    </component>
</template>

<script lang="ts">
import { defineAsyncComponent, defineComponent } from 'vue';
import { useAdditionalServer } from '@/composition/useAdditionalServer';
import { isLoggedIn } from '@/helpers/app-helper';

export default defineComponent({
    components: {
        DefaultLayout: defineAsyncComponent(() => import('@/layout/DefaultLayout.vue')),
        AdminLayout: defineAsyncComponent(() => import('@/layout/AdminLayout.vue')),
        UserLayout: defineAsyncComponent(() => import('@/layout/UserLayout.vue')),
    },
    computed: {
        layout() {
            return isLoggedIn.value ? 'UserLayout' : 'DefaultLayout';
        },
    },
    mounted() {
        const handleViewportHeight = () => {
            document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
            console.log('viewport-height', window.innerHeight);
        };

        window.addEventListener('resize', handleViewportHeight);

        handleViewportHeight();

        this.blurWhenClickOutsideInput();
    },
    async created() {
        const { mainServer, setMainServer } = await useAdditionalServer();
        setMainServer(mainServer.value);
        // console.log('mainServer', mainServer.value);
    },
    methods: {
        //input blur for safari
        blurWhenClickOutsideInput() {
            if (document.body.firstElementChild) {
                (document.body.firstElementChild as HTMLElement).tabIndex = 1;
            }
        },
    },
});
</script>
