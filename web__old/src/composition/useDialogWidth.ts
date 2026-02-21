import { onMounted, ref } from 'vue';
import { DIALOG_WIDTH } from '@/types/base-screen.types';
import { useMobile } from './useMobile';

export const useDialogWidth = () => {
    const width = ref();
    const isMobile = useMobile();

    onMounted(() => {
        width.value = isMobile.isMobile.value ? '100%' : DIALOG_WIDTH;
    });

    return width;
};
