import { defineComponent } from 'vue';
import { TvBtn } from '@/components/TvBtn';
import { useI18n } from 'vue-i18n';

export default defineComponent({
    components: {
        TvBtn,
    },
    props: {
        modelValue: Boolean,
        title: {
            type: String,
            default: 'Delete record',
        },
        text: {
            type: String,
            default: '',
        },
    },
    emits: ['update:modelValue', 'ok', 'cancel'],
    data():{ $t: (key: string) => string } {
        const { t: $t } = useI18n();
        return {
            // dialog: true,
            $t,
        };
    },
    methods: {
        updateModel() {
            this.$emit('update:modelValue', false);
        },
        ok() {
            this.updateModel();
            this.$emit('ok');
        },
        cancel() {
            this.updateModel();
            this.$emit('cancel');
        },
    },
});
