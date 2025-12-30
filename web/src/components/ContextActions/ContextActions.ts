import type { GoalItem } from 'taskview-api';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { GoalActionsItems } from '@/types/goals.types';

export default defineComponent({
    props: {
        activator: {
            type: Object as PropType<HTMLElement>,
            default: null,
        },
        goal: {
            type: Object as PropType<GoalItem>,
            default: null,
        },
        showMenu: Boolean,
        actions: {
            type: Array as PropType<GoalActionsItems>,
            default: null,
        },
    },
    data(): { dialogStatusModel: boolean } {
        return {
            dialogStatusModel: false,
        };
    },
    watch: {
        dialogStatusModel(value: boolean): void {
            if (!value) {
                //eslint-disable-next-line vue/require-explicit-emits
                this.$emit('menuClosed');
            }
        },
        showMenu(value: boolean): void {
            this.dialogStatusModel = value;
        },
    },
    methods: {
        emitSelectedEvent(eventName: string): void {
            this.$emit(eventName);
        },
    },
});
