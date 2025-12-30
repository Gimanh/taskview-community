import { ref } from 'vue';

export const useTextfieldStyles = () => {
    const styles = ref({
        variant: 'solo',
        'hide-details': true,
        enterkeyhint: 'go',
        class: 'rad10-v-field',
        density: 'comfortable',
        spellcheck: 'false',
    } as const);
    return styles.value;
};
