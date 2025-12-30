import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        modelValue: {
            type: String,
            required: true,
        },
        component: {
            type: String,
            default: 'v-text-field',
        },
    },
    emits: ['update:modelValue'],
    data() {
        return {};
    },
});
