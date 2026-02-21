import { mdiDotsVertical } from '@mdi/js';
import type { GoalListItem } from 'taskview-api';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { TvBtn } from '@/components/TvBtn';
import type { GoalListEventMoreMenu } from '@/types/goal-lists.types';

export default defineComponent({
    components: { TvBtn },
    props: {
        list: {
            type: Object as PropType<GoalListItem>,
            required: true,
        },
    },
    data() {
        return {
            mdiDotsVertical,
        };
    },
    computed: {
        isActive() {
            return this.$route.params.listId === this.list.id.toString();
        },
    },
    methods: {
        showActionDialog(ev: Event) {
            const event: GoalListEventMoreMenu = {
                activator: ev.currentTarget as HTMLElement,
                list: this.list,
            };
            //eslint-disable-next-line vue/require-explicit-emits
            this.$emit('showActions', event);
        },

        goToTasks() {
            this.$router.push({
                name: 'goal-list-tasks',
                params: { listId: this.list.id },
            });
        },
    },
});
