import { onBeforeUnmount, onMounted, type Ref, watch } from 'vue';
import { debounce } from '@/helpers/app-helper';

/** Call given callback when scroll bottom cross the threshold */
export const useScrollToBottom = (container: Ref<HTMLElement | null>, threshold: number, callback: () => void) => {
    const handler = () => {
        if (!container.value) return;

        const scrollPosition = container.value.scrollTop + container.value.clientHeight;

        const totalHeight = container.value.scrollHeight;

        if (scrollPosition >= totalHeight - threshold) {
            console.log('Почти достигли конца контейнера!', scrollPosition);
            callback();
        }
    };

    const debouncedHandler = debounce(handler, 60);

    const addListener = () => {
        if (container.value) {
            container.value.addEventListener('scroll', debouncedHandler);
        }
    };

    const removeListener = () => {
        if (container.value) {
            container.value.removeEventListener('scroll', debouncedHandler);
        }
    };

    onMounted(() => {
        addListener();
    });

    onBeforeUnmount(() => {
        removeListener();
    });

    watch(
        () => container.value,
        (newValue, oldValue) => {
            if (oldValue) {
                oldValue.removeEventListener('scroll', debouncedHandler);
            }
            if (newValue) {
                newValue.addEventListener('scroll', debouncedHandler);
            }
        },
        { immediate: true }
    );
};
