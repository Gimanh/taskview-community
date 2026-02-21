<template>
    <div class="space-y-8 p-4">
        <h2 class="text-2xl font-bold">
            Примеры использования TTabs
        </h2>

        <!-- Базовые вкладки -->
        <div>
            <h3 class="text-lg font-semibold mb-2">
                Базовые вкладки
            </h3>
            <TTabs 
                v-model="activeBasicTab" 
                :tabs="basicTabs"
                @tab-change="handleTabChange"
            >
                <template #pending>
                    <div class="p-4 bg-gray-50 rounded">
                        <h4>В ожидании</h4>
                        <p>Список задач в ожидании выполнения</p>
                    </div>
                </template>
                <template #complete>
                    <div class="p-4 bg-green-50 rounded">
                        <h4>Завершено</h4>
                        <p>Список выполненных задач</p>
                    </div>
                </template>
            </TTabs>
        </div>

        <!-- Вкладки с иконками -->
        <div>
            <h3 class="text-lg font-semibold mb-2">
                С иконками
            </h3>
            <TTabs 
                v-model="activeIconTab" 
                :tabs="iconTabs"
            >
                <template #tasks>
                    <div class="p-4">
                        Контент задач
                    </div>
                </template>
                <template #goals>
                    <div class="p-4">
                        Контент целей
                    </div>
                </template>
                <template #analytics>
                    <div class="p-4">
                        Контент аналитики
                    </div>
                </template>
            </TTabs>
        </div>

        <!-- Вкладки с бейджами -->
        <div>
            <h3 class="text-lg font-semibold mb-2">
                С бейджами
            </h3>
            <TTabs 
                v-model="activeBadgeTab" 
                :tabs="badgeTabs"
            >
                <template #inbox>
                    <div class="p-4">
                        Входящие сообщения
                    </div>
                </template>
                <template #sent>
                    <div class="p-4">
                        Отправленные сообщения
                    </div>
                </template>
                <template #drafts>
                    <div class="p-4">
                        Черновики
                    </div>
                </template>
            </TTabs>
        </div>

        <!-- Разные размеры -->
        <div>
            <h3 class="text-lg font-semibold mb-2">
                Разные размеры
            </h3>
            <div class="space-y-4">
                <TTabs 
                    v-model="activeSizeTab" 
                    :tabs="sizeTabs"
                    size="sm"
                />
                <TTabs 
                    v-model="activeSizeTab" 
                    :tabs="sizeTabs"
                    size="md"
                />
                <TTabs 
                    v-model="activeSizeTab" 
                    :tabs="sizeTabs"
                    size="lg"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TTabs from './TTabs.vue';

interface Tab {
    key: string;
    label: string;
    icon?: string;
    badge?: string | number;
    disabled?: boolean;
    content?: string;
}

// Базовые вкладки
const activeBasicTab = ref('pending');
const basicTabs: Tab[] = [
    { key: 'pending', label: 'В ожидании' },
    { key: 'complete', label: 'Завершено' },
];

// Вкладки с иконками
const activeIconTab = ref('tasks');
const iconTabs: Tab[] = [
    { key: 'tasks', label: 'Задачи', icon: 'mdi-format-list-checks' },
    { key: 'goals', label: 'Цели', icon: 'mdi-target' },
    { key: 'analytics', label: 'Аналитика', icon: 'mdi-chart-line' },
];

// Вкладки с бейджами
const activeBadgeTab = ref('inbox');
const badgeTabs: Tab[] = [
    { key: 'inbox', label: 'Входящие', badge: 12 },
    { key: 'sent', label: 'Отправленные', badge: 5 },
    { key: 'drafts', label: 'Черновики', badge: 3 },
];

// Размеры
const activeSizeTab = ref('small');
const sizeTabs: Tab[] = [
    { key: 'small', label: 'Маленький' },
    { key: 'medium', label: 'Средний' },
    { key: 'large', label: 'Большой' },
];

const handleTabChange = (tabKey: string, tab: Tab) => {
    console.log('Вкладка изменена:', tabKey, tab);
};
</script> 