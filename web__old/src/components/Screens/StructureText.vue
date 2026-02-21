<template>
    <div
        class="pa-5 pb-10"
        style="color: var(--icon-grey); font-size: 12px"
    >
        <span>{{ $t('msg.structure') }}</span>
    </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const $t = useI18n().t;
</script>
