<template>
    <div class="w100 pr-3">
        <SearchAll
            :placeholder="$t('msg.searchTask')"
            :density="'compact'"
            :variant="'solo-filled'"
            flat
        />
    </div>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import SearchAll from '@/components/modules/screen-main/components/SearchAll.vue';
const $t = useI18n().t;
</script>
