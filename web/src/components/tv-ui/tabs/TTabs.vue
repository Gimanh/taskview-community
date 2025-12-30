<template>
    <div
        :class="styles.tabsContainer"
        class="dark:bg-tv-card"
    >
        <!-- Заголовки вкладок -->
        <div :class="styles.tabsHeader">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                :class="[
                    styles.tabButton,
                    activeTab === tab.key ? styles.tabActive : styles.tabInactive,
                    size === 'sm' ? styles.tabButtonSm : '',
                    size === 'lg' ? styles.tabButtonLg : ''
                ]"
                :disabled="tab.disabled"
                @click="selectTab(tab.key)"
            >
                <span
                    v-if="tab.icon"
                    :class="styles.tabIcon"
                >
                    <i :class="tab.icon" />
                </span>
                <span :class="styles.tabLabel">{{ tab.label }}</span>
                <span
                    v-if="tab.badge"
                    :class="styles.tabBadge"
                >
                    {{ tab.badge }}
                </span>
            </button>
        </div>

        <!-- <hr :class="styles.tabsDivider"> -->

        <!-- Контент вкладок -->
        <div :class="styles.tabsContent">
            <template
                v-for="tab in tabs"
                :key="tab.key"
            >
                <div
                    v-if="activeTab === tab.key"
                  
                    :class="styles.tabPanel"
                >
                    <slot
                        :name="tab.key"
                        :tab="tab"
                    >
                        {{ tab.content }}
                    </slot>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import styles from './TTabs.module.scss';

// Имя компонента для линтера
defineOptions({
    name: 'TTabs',
});

interface Tab {
    key: string;
    label: string;
    icon?: string;
    badge?: string | number;
    disabled?: boolean;
    content?: string;
}

interface Props {
    tabs: Tab[];
    modelValue?: string; // Для v-model
    size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    size: 'md',
});

const emit = defineEmits<{
    'update:modelValue': [value: string];
    'tab-change': [tabKey: string, tab: Tab];
}>();

// Активная вкладка
const activeTab = computed({
    get: () => props.modelValue || props.tabs[0]?.key || '',
    set: (value: string) => emit('update:modelValue', value),
});

// Выбор вкладки
const selectTab = (tabKey: string) => {
    const tab = props.tabs.find((t) => t.key === tabKey);
    if (tab && !tab.disabled) {
        activeTab.value = tabKey;
        emit('tab-change', tabKey, tab);
    }
};
</script>