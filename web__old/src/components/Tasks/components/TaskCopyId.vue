<template>
    <div>
        <v-btn
            :icon="mdiMusicAccidentalSharp"
            @click="copy"
        />
        <AppAlert
            v-model="showAlert"
            :title="$t('msg.copying')"
            :message="copyStatus ? $t('msg.taskIdCopied') : $t('msg.canNotCopyTaskId')"
            :type="type"
            width="400px"
        />
    </div>
</template>
<script setup lang="ts">
import { mdiMusicAccidentalSharp } from '@mdi/js';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppAlert from '@/components/AppAlert.vue';
import { useI18n } from 'vue-i18n';

const route = useRoute();
const id = computed(() => `${route.params.user}/${route.params.goalId}/${route.params.listId}/${route.params.taskId}`);
const showAlert = ref(false);
const copyStatus = ref(false);
const type = ref<'success' | 'info' | 'warning' | 'error'>('info');
const $t = useI18n().t;

function copy() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(id.value);
        copyStatus.value = true;
    } else {
        copyStatus.value = false;
        type.value = 'warning';
    }
    showAlert.value = true;
}
</script>
