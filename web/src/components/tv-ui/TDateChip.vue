<template>
    <TChipShape
        class="flex items-center"
        :class="{'text-rose-500': !completed && dateColorClass}"
    >
        <VIcon
            :icon="mdiCalendarBlankOutline"
            size="16"
        />

        <span v-if="showWord && formattedDateStart">{{ i18n.t('msg.dateFrom') }}</span>
        {{ formattedDateStart }}

        <span v-if="showWord && formattedDateEnd">{{ i18n.t('msg.dateTo') }}</span>
        {{ formattedDateEnd }}
    </TChipShape>
</template>

<script setup lang="ts">
import { mdiCalendarBlankOutline } from '@mdi/js';
import { useDateFormat } from '@vueuse/core';
import { computed, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import TChipShape from '@/components/tv-ui/TChipShape.vue';
import { type TvFormatDateOptions, useTvFormatDate } from '@/composition/useTvFormatDate';

const props = defineProps<
    {
        completed?: boolean;
        dateStart?: Date | string | null | undefined;
        dateEnd?: Date | string | null | undefined;
        dateColor?: (date: string) => boolean;
        showWord?: boolean;
    } & TvFormatDateOptions
>();

const i18n = useI18n();
const formattedDateStart = ref('');
const formattedDateEnd = ref('');

watchEffect(() => {
    formattedDateStart.value = props.dateStart
        ? useTvFormatDate(
              props.dateStart,
              {
                  showTime: props.showTime,
                  showDayName: props.showDayName,
                  format: props.format || 'short',
                  locale: props.locale,
              },
              i18n as ReturnType<typeof useI18n>
          ).value
        : '';

    formattedDateEnd.value = props.dateEnd
        ? useTvFormatDate(
              props.dateEnd,
              {
                  showTime: props.showTime,
                  showDayName: props.showDayName,
                  format: props.format || 'short',
                  locale: props.locale,
              },
              i18n as ReturnType<typeof useI18n>
          ).value
        : '';
});

const dateColorClass = computed(() => {
    if (props.dateColor) {
        return formattedDateEnd.value && formattedDateEnd.value ? props.dateColor(formattedDateEnd.value) : undefined;
    }

    if (!props.dateEnd) return false;

    const endDate = new Date(useDateFormat(props.dateEnd, 'YYYY-MM-DD').value);
    const now = new Date(useDateFormat(new Date(), 'YYYY-MM-DD').value);

    return endDate < now;
});
</script>