<template>
    <v-list-item
        :title="theme.global.name.value === 'light' ? $t('msg.themeDark') : $t('msg.themeLight')"
        @click="toggleTheme"
    >
        <template #prepend>
            <v-icon>
                {{ mdiInvertColors }}
            </v-icon>
        </template>
    </v-list-item>
</template>

<script setup lang="ts">
import { mdiInvertColors } from '@mdi/js';
import { useTheme } from 'vuetify';
import { $ls } from '@/plugins/axios';
import { useI18n } from 'vue-i18n';

const theme = useTheme();
const $t = useI18n().t;
const toggleTheme = () => {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
    $ls.setValue('theme', theme.global.name.value);
};

restoreTheme();

async function restoreTheme() {
    const themeValue = await $ls.getValue('theme');
    if (themeValue) {
        theme.global.name.value = themeValue;
    }
}
</script>
