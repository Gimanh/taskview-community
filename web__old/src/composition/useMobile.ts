import { computed } from 'vue';
import { useDisplay } from 'vuetify';

export function useMobile() {
    const display = useDisplay();
    return {
        isMobile: computed(() => display.sm.value || display.xs.value),
    };
}
