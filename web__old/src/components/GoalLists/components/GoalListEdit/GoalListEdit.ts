import type { GoalListItem } from 'taskview-api';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { TTextField } from '@/components/TTextField';
import { TvBtn } from '@/components/TvBtn';
import { useGoalListsStore } from '@/stores/goal-lists.store';
import { DEFAULT_GOAL_ITEM } from '@/types/goals.types';
import { useI18n } from 'vue-i18n';

type DataType = {
    storage: ReturnType<typeof useGoalListsStore>;
    listName: string;
    loading: boolean;
    $t: (key: string) => string;
};

export default defineComponent({
    components: { TTextField, TvBtn },
    props: {
        modelValue: Boolean,
        list: {
            type: Object as PropType<GoalListItem>,
            required: true,
            default: () => DEFAULT_GOAL_ITEM,
        },
    },
    emits: ['update:modelValue'],
    data(): DataType {
        const storage = useGoalListsStore();
        const { t: $t } = useI18n();
        return {
            storage,
            listName: '',
            loading: false,
            $t,
        };
    },
    computed: {
        canSave(): boolean {
            return this.listName !== this.list.name;
        },
    },
    watch: {
        modelValue: {
            handler(value: boolean) {
                if (value) {
                    this.listName = this.list.name;
                }
            },
            immediate: true,
        },
    },
    methods: {
        async ok(): Promise<boolean> {
            if (!this.canSave) {
                this.cancel();
                return false;
            }
            if (this.loading) {
                return false;
            }
            this.loading = true;
            const result = await this.storage.updateList({
                id: this.list.id,
                name: this.listName,
            });
            this.loading = false;
            if (result) {
                this.$emit('update:modelValue', false);
                return true;
            }
            return false;
        },
        cancel(): void {
            this.$emit('update:modelValue', false);
        },
    },
});
