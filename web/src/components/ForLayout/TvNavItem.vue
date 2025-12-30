<template>
    <div>
        <v-card
            class="tv-nav-drawer__item rad10 d-flex align-center pt-2 pb-2 pl-3 pr-3"
            :class="{ active: isActive }"
            @click="goToRoute"
        >
            <div class="mr-2">
                <v-icon color="var(--nav-item-icon-color)">
                    {{ item.icon }}
                </v-icon>
            </div>
            <div class="txt-subtitle-2 flex-grow-1">
                {{ $t(item.title) }}
            </div>
            <div v-if="item.expandable">
                <v-icon> {{ expandIcon }} </v-icon>
            </div>
        </v-card>
        <transition
            name="expand"
            @enter="enter"
            @leave="leave"
        >
            <div
                v-if="item.component"
                v-show="expandModel"
                class="expandable-box"
            >
                <component :is="item.component" />
            </div>
        </transition>
    </div>
</template>
<script setup lang="ts">
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { TvNavItemT } from '@/types/layout.types';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ item: TvNavItemT }>();
const expandModel = ref(!!props.item.expanded);
const expandIcon = computed(() => (expandModel.value ? mdiChevronUp : mdiChevronDown));
const router = useRouter();
const { t: $t } = useI18n();
const isActive = computed(() => {
    if (props.item.to && typeof props.item.to !== 'string') {
        return props.item.to.name === router.currentRoute.value.name;
    }
    return false;
});

const goToRoute = async () => {
    if (props.item.to) {
        await router.push(props.item.to);
    } else {
        expandModel.value = !expandModel.value;
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enter(el: any) {
    el.style.height = '0px';
    //eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflow = 'hidden';
    setTimeout(() => {
        el.style.overflow = '';
        el.style.height = 'auto';
    }, 305);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leave(el: any) {
    el.style.height = `${el.scrollHeight}px`;
    //eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight; // Trigger reflow
    el.style.height = '0px';
    el.style.overflow = 'hidden';
}
</script>

<style>
/* Анимация высоты при появлении и исчезновении */
.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
}
.expand-enter-from,
.expand-leave-to {
    height: 0;
    transform: translateX(-30px);
}
</style>
