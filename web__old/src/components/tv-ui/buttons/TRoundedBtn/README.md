# TRoundedBtn - Универсальная круглая кнопка

Поддерживает MDI иконки, SVG пути и встроенные SVG.

## Использование

```vue
<template>
  <!-- MDI иконка -->
  <TRoundedBtn 
    icon="mdi-heart" 
    @click="handleClick" 
  />

  <!-- SVG путь (sprite) -->
  <TRoundedBtn 
    icon="#icon-heart" 
    color="#ff6b6b" 
    @click="handleHeartClick" 
  />

  <!-- Встроенный SVG -->
  <TRoundedBtn 
    :icon="heartSvg" 
    color="#4f46e5" 
    @click="handleCustomClick" 
  />

  <!-- С кастомным фоном -->
  <TRoundedBtn 
    icon="mdi-plus" 
    color="#4f46e5" 
    backgroundColor="rgba(79, 70, 229, 0.1)" 
    @click="handleAddClick" 
  />

  <!-- Разные размеры -->
  <TRoundedBtn icon="mdi-heart" size="sm" />
  <TRoundedBtn icon="mdi-heart" size="md" />
  <TRoundedBtn icon="mdi-heart" size="lg" />
  <TRoundedBtn icon="mdi-heart" size="xl" />

  <!-- Отключенная кнопка -->
  <TRoundedBtn 
    icon="mdi-heart" 
    disabled 
    @click="handleClick" 
  />
</template>

<script setup>
import TRoundedBtn from './index.vue';

// Встроенный SVG
const heartSvg = `
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
`;

const handleClick = () => {
  console.log('Кнопка нажата!');
};

const handleHeartClick = () => {
  console.log('Сердце нажато!');
};

const handleCustomClick = () => {
  console.log('Кастомная иконка нажата!');
};

const handleAddClick = () => {
  console.log('Добавить нажато!');
};
</script>
```

## Типы иконок

### 1. MDI иконки
```vue
<TRoundedBtn icon="mdi-heart" />
<TRoundedBtn icon="mdi-star" />
<TRoundedBtn icon="mdi-plus" />
```

### 2. SVG пути (sprite)
```vue
<TRoundedBtn icon="#icon-heart" />
<TRoundedBtn icon="icons.svg#heart" />
```

### 3. Встроенные SVG
```vue
<TRoundedBtn :icon="customSvg" />

<script setup>
const customSvg = `
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
`;
</script>
```

## Пропсы

| Проп | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `icon` | `string` | `'mdi-circle'` | MDI иконка, SVG путь или встроенный SVG |
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

## Автоматическое определение типа иконки

Компонент автоматически определяет тип иконки:

- **MDI**: начинается с `mdi-`
- **SVG путь**: начинается с `#` или содержит `.svg#`
- **Встроенный SVG**: все остальное (обрабатывается как HTML)

## Особенности

- ✅ Поддержка MDI, SVG путей и встроенных SVG
- ✅ Автоматический фон с прозрачностью
- ✅ Hover и active эффекты
- ✅ TypeScript поддержка
- ✅ Доступность (focus states)
- ✅ Анимации при наведении и нажатии 