# TRoundBtn - Круглая кнопка с иконкой MDI

## Использование

```vue
<template>
  <!-- Базовая кнопка -->
  <TRoundBtn 
    icon="mdi-heart" 
    @click="handleClick" 
  />

  <!-- Кнопка с кастомным цветом -->
  <TRoundBtn 
    icon="mdi-star" 
    color="#ff6b6b" 
    @click="handleStarClick" 
  />

  <!-- Кнопка с кастомным фоном -->
  <TRoundBtn 
    icon="mdi-plus" 
    color="#4f46e5" 
    backgroundColor="rgba(79, 70, 229, 0.1)" 
    @click="handleAddClick" 
  />

  <!-- Разные размеры -->
  <TRoundBtn icon="mdi-heart" size="sm" />
  <TRoundBtn icon="mdi-heart" size="md" />
  <TRoundBtn icon="mdi-heart" size="lg" />
  <TRoundBtn icon="mdi-heart" size="xl" />

  <!-- Отключенная кнопка -->
  <TRoundBtn 
    icon="mdi-heart" 
    disabled 
    @click="handleClick" 
  />
</template>

<script setup>
import TRoundBtn from './TRoundBtn.vue';

const handleClick = () => {
  console.log('Кнопка нажата!');
};

const handleStarClick = () => {
  console.log('Звезда нажата!');
};

const handleAddClick = () => {
  console.log('Добавить нажато!');
};
</script>
```

## Пропсы

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `icon` | `string` | `'mdi-circle'` | MDI иконка (например: 'mdi-heart', 'mdi-star') |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Размер кнопки |
| `color` | `string` | `'#4f46e5'` | Цвет иконки (hex, rgb, или CSS color) |
| `backgroundColor` | `string` | `''` | Цвет фона (если не указан, будет цвет иконки с 12% прозрачности) |
| `disabled` | `boolean` | `false` | Отключена ли кнопка |

## События

| Событие | Описание |
|---------|----------|
| `click` | Срабатывает при клике на кнопку |

## Размеры

- `sm`: 32x32px (w-8 h-8)
- `md`: 40x40px (w-10 h-10) - по умолчанию
- `lg`: 48x48px (w-12 h-12)
- `xl`: 56x56px (w-14 h-14)

## Особенности

- ✅ Автоматический фон с прозрачностью на основе цвета иконки
- ✅ Hover и active эффекты
- ✅ Поддержка всех MDI иконок
- ✅ TypeScript поддержка
- ✅ Доступность (focus states)
- ✅ Анимации при наведении и нажатии 