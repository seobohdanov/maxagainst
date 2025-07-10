# Руководство по локализации Spivanka

## Обзор

Это руководство описывает, как добавить поддержку новых языков в приложение Spivanka.

## Поддерживаемые языки

- 🇺🇦 **Украинский** (`uk`) - основной язык
- 🇭🇷 **Хорватский** (`hr`) - добавлен

## Структура файлов

```
locales/
├── uk.json          # Украинские переводы
└── hr.json          # Хорватские переводы

hooks/
└── useTranslation.ts # Хук для работы с переводами

components/
├── LanguageSwitcher.tsx    # Переключатель языков
└── TranslatedExample.tsx   # Пример использования
```

## Как добавить новый язык

### 1. Создайте файл переводов

Создайте файл `locales/[код_языка].json`:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "home": "Home",
    "dashboard": "Dashboard"
  }
}
```

### 2. Обновите конфигурацию Next.js

В `next.config.js` добавьте новый язык:

```javascript
i18n: {
  locales: ['uk', 'hr', 'en'], // добавьте новый код
  defaultLocale: 'uk',
  localeDetection: true,
},
```

### 3. Обновите хук useTranslation

В `hooks/useTranslation.ts` добавьте новый язык:

```typescript
const translations = {
  uk: require('../locales/uk.json'),
  hr: require('../locales/hr.json'),
  en: require('../locales/en.json') // добавьте новый
}
```

### 4. Обновите список языков

В `hooks/useTranslation.ts` добавьте в `useLocales()`:

```typescript
export function useLocales() {
  return [
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' } // добавьте новый
  ]
}
```

## Использование переводов

### В компонентах

```tsx
import { useTranslation } from '@/hooks/useTranslation'

export default function MyComponent() {
  const { t, locale, changeLocale } = useTranslation()

  return (
    <div>
      <h1>{t('landing.title')}</h1>
      <p>{t('landing.subtitle')}</p>
      <button onClick={() => changeLocale('hr')}>
        {t('common.save')}
      </button>
    </div>
  )
}
```

### С параметрами

```tsx
// В переводе: "Привет, {{name}}!"
t('greeting.hello', { name: 'John' })
// Результат: "Привет, John!"
```

### Условные переводы

```tsx
const { isLocale } = useTranslation()

{isLocale('hr') && <CroatianSpecificContent />}
```

## Структура переводов

### Рекомендуемая структура

```json
{
  "common": {
    "loading": "...",
    "error": "...",
    "success": "..."
  },
  "navigation": {
    "home": "...",
    "dashboard": "..."
  },
  "landing": {
    "title": "...",
    "subtitle": "...",
    "features": {
      "title": "...",
      "personalized": "..."
    }
  },
  "auth": {
    "signIn": "...",
    "signOut": "..."
  },
  "dashboard": {
    "title": "...",
    "greetings": "..."
  },
  "greeting": {
    "form": {
      "title": "...",
      "recipientName": "..."
    },
    "status": {
      "generating": "...",
      "success": "..."
    }
  },
  "calendar": {
    "title": "...",
    "connect": "..."
  },
  "account": {
    "title": "...",
    "profile": "..."
  },
  "payment": {
    "title": "...",
    "amount": "..."
  },
  "errors": {
    "network": "...",
    "server": "..."
  },
  "messages": {
    "greetingCreated": "...",
    "accountDeleted": "..."
  }
}
```

## Лучшие практики

### 1. Именование ключей

- Используйте точечную нотацию: `section.subsection.key`
- Будьте последовательны в именовании
- Группируйте связанные переводы

### 2. Параметры

- Используйте `{{paramName}}` для параметров
- Всегда предоставляйте fallback значения

### 3. Множественные формы

Для множественных форм используйте параметры:

```json
{
  "greetings": {
    "count": "{{count}} привітання",
    "count_plural": "{{count}} привітань"
  }
}
```

### 4. Форматирование

- Используйте HTML-теги в переводах при необходимости
- Будьте осторожны с длинными строками

## Тестирование

### Проверка переводов

```bash
# Проверьте, что все ключи присутствуют
node -e "
const uk = require('./locales/uk.json');
const hr = require('./locales/hr.json');
const keys = Object.keys(uk);
keys.forEach(key => {
  if (!hr[key]) console.log('Missing key:', key);
});
"
```

### Автоматическая проверка

Создайте скрипт для проверки переводов:

```javascript
// scripts/check-translations.js
const fs = require('fs');
const path = require('path');

function checkTranslations() {
  const localesDir = path.join(__dirname, '../locales');
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  
  const translations = {};
  files.forEach(file => {
    const locale = file.replace('.json', '');
    translations[locale] = JSON.parse(fs.readFileSync(path.join(localesDir, file)));
  });
  
  // Проверьте, что все ключи присутствуют во всех языках
  const baseKeys = Object.keys(translations.uk);
  
  Object.keys(translations).forEach(locale => {
    if (locale === 'uk') return;
    
    baseKeys.forEach(key => {
      if (!translations[locale][key]) {
        console.log(`Missing key "${key}" in ${locale}`);
      }
    });
  });
}

checkTranslations();
```

## SEO и метаданные

### Динамические метаданные

```tsx
// app/[locale]/layout.tsx
export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = useTranslation()
  
  return {
    title: t('landing.title'),
    description: t('landing.subtitle'),
  }
}
```

### Альтернативные языки

```tsx
export async function generateMetadata({ params }: { params: { locale: string } }) {
  return {
    alternates: {
      languages: {
        'uk': '/uk',
        'hr': '/hr',
      },
    },
  }
}
```

## Производительность

### Ленивая загрузка переводов

```tsx
// Динамический импорт переводов
const translations = {
  uk: () => import('../locales/uk.json'),
  hr: () => import('../locales/hr.json'),
}
```

### Кэширование

```tsx
import { useMemo } from 'react'

const t = useMemo(() => {
  // Кэшируйте функцию перевода
  return (key: string) => { /* ... */ }
}, [locale])
```

## Отладка

### Включение отладки

```tsx
const t = (key: string) => {
  const value = getTranslation(key);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Translation: ${key} -> ${value}`);
  }
  return value;
}
```

### Проверка отсутствующих ключей

```tsx
const t = (key: string) => {
  const value = getTranslation(key);
  if (!value || value === key) {
    console.warn(`Missing translation: ${key}`);
  }
  return value || key;
}
```

## Полезные ссылки

- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n-routing)
- [React i18next](https://react.i18next.com/)
- [ICU Message Format](https://formatjs.io/docs/intl-messageformat/)
- [Croatian Language Resources](https://github.com/unicode-org/cldr/tree/main/common/main/hr.xml) 