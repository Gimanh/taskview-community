# TaskView API

Библиотека для работы с TaskView API.

## Установка

```bash
npm install taskview-api
```

## Использование

```javascript
import { setupCounter } from 'taskview-api'

// Использование функции setupCounter
const button = document.querySelector('#counter')
setupCounter(button)
```

## Разработка

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Сборка библиотеки

```bash
npm run build
```

### Проверка типов

```bash
npm run type-check
```

## Структура проекта

- `src/index.ts` - основной файл экспорта библиотеки
- `src/counter.ts` - модуль с функцией счетчика
- `dist/` - собранные файлы библиотеки

## Форматы сборки

Библиотека собирается в следующих форматах:
- ES Module (`.es.js`)
- CommonJS (`.cjs.js`) 
- UMD (`.umd.js`)
- TypeScript типы (`.d.ts`) 