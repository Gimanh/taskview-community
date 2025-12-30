/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['selector', '.v-theme--dark'],
    important: true,
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    safelist: [
        // 'text-tv-active'
    ],
    theme: {
        extend: {
            colors: {
                'priority-low': '#38D681',
                'priority-medium': '#FF9100',
                'priority-high': '#FF1744',
                'tv-active': '#8e71ff',
                // Кастомные цвета для градиента TODAY WIDGET
                'gradient-today-start': '#4f46e5',
                'gradient-today-end': '#7c3aed',

                'tv-tabs-active': 'var(--tv-tabs-active-color)',

                'tv-card-color-bg': 'var(--tv-card-color-bg)',
                'tv-main-bg': 'var(--tv-main-bg)',

                //use color for text which is not active like dates in task item or other text
                'tv-gray-700': 'var(--tv-gray-700)',
                'tv-text-active': 'var(--tv-text-active)',

            },
            backgroundColor: {
                'tv-card': 'var(--tv-card-color-bg)',
                'tv-card-active': 'var(--tv-card-active-color)',
                'task-item-bg': 'var(--task-item-bg)',
            },
            borderRadius: {
                tv10: '10px'
            },
            boxShadow: {
                'tv-md': '0px 2px 1px -1px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, 0.2)), 0px 1px 1px 0px var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, 0.14)), 0px 1px 3px 0px var(--v-shadow-key-ambient-opacity, rgba(0, 0, 0, 0.12))',
                'custom': '0 4px 12px rgba(0, 0, 0, 0.08)',
                md: '0px 2px 1px -1px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, 0.2)), 0px 1px 1px 0px var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, 0.14)), 0px 1px 3px 0px var(--v-shadow-key-ambient-opacity, rgba(0, 0, 0, 0.12))'
            },
            height: {
                'kanban-title': 'var(--kanban-card-title-height)',
                'screen-height': 'var(--tv-row-height)'
            },
            minHeight: {
                'kanban-title': 'var(--kanban-card-title-height)'
            },
        },
    },
    plugins: [],
};
