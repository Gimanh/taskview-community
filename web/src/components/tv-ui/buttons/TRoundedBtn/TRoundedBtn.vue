<template>
    <button 
        :class="[
            'rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2',
            sizeClasses[props.size],
            props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            props.backgroundColor
        ]"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            :class="[svgSizeClasses[props.size], props.color]"
        >
            <path
                :d="icon"
                fill="currentColor"
            />
        </svg>
    </button>
</template>

<script lang="ts" setup>
interface Props {
    icon?: string; // SVG path (например: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z')
    size?: 'sm' | 'md' | 'lg' | 'xl'; // Размер кнопки
    color?: string; // Цвет иконки (hex, rgb, или CSS color)
    backgroundColor?: string; // Цвет фона (если не указан, будет цвет иконки с прозрачностью)
    disabled?: boolean; // Отключена ли кнопка
}

const props = withDefaults(defineProps<Props>(), {
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    size: 'md',
    color: '#ffffff',
    backgroundColor: '',
    disabled: false,
});

// Статические классы для размеров кнопки
const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
    xl: 'w-14 h-14 p-3',
};

// Статические классы для размеров SVG
const svgSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
};

// // Стили кнопки
// const buttonStyle = computed(() => {
//     const bgColor = props.backgroundColor || `${props.color}20`; // 20 = 12% прозрачности
//     return {
//         backgroundColor: bgColor,
//         border: 'none'
//     };
// });

// // Стили иконки
// const iconStyle = computed(() => ({
//     color: props.color
// }));
</script>

<style scoped>
/* Дополнительные стили для hover эффекта */
button:hover:not(:disabled) {
    filter: brightness(1.1);
}

button:active:not(:disabled) {
    filter: brightness(0.9);
}

button:disabled {
    cursor: not-allowed !important;
    opacity: 0.5 !important;
}
</style>
