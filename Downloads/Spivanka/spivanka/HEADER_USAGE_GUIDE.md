# Руководство по использованию компонента Header

## Обзор

Компонент `Header` - это универсальный компонент навигации, который может использоваться на всех страницах приложения Spivanka. Он предоставляет единообразный интерфейс навигации с поддержкой различных вариантов отображения.

## Импорт

```tsx
import Header from '@/components/Header'
```

## Основные варианты использования

### 1. Главная страница (полная функциональность)

```tsx
<Header 
  session={session}
  onLoginClick={onLoginClick}
  onSignOut={onSignOut}
  onCreateClick={onCreateClick}
  onExamplesClick={onExamplesClick}
  onDashboardClick={onDashboardClick}
  hasActiveGeneration={hasActiveGeneration}
  onActiveGenerationClick={onActiveGenerationClick}
/>
```

### 2. Страница с кнопкой "Назад"

```tsx
<Header 
  session={session}
  showBackButton={true}
  backButtonText="Главная"
  onBackClick={() => router.back()}
  pageTitle="Название страницы"
  onCreateClick={onCreateClick}
  variant="minimal"
/>
```

### 3. Админ-панель

```tsx
<Header 
  session={session}
  showBackButton={true}
  backButtonText="На главную"
  onBackClick={() => router.push('/')}
  pageTitle="Админ-панель"
  variant="admin"
/>
```

### 4. Минимальная версия

```tsx
<Header 
  session={session}
  variant="minimal"
  pageTitle="Заголовок"
/>
```

## Параметры (Props)

### Обязательные
Нет обязательных параметров - все опциональные.

### Опциональные

#### Сессия и аутентификация
- `session?: Session | null` - сессия пользователя
- `onLoginClick?: () => void` - обработчик входа
- `onSignOut?: () => void` - обработчик выхода

#### Навигация
- `onCreateClick?: () => void` - создание поздравления
- `onExamplesClick?: () => void` - переход к примерам
- `onDashboardClick?: () => void` - переход в кабинет

#### Активная генерация
- `hasActiveGeneration?: boolean` - есть ли активная генерация
- `onActiveGenerationClick?: () => void` - клик по активной генерации
- `onClearGenerationClick?: () => void` - очистка генерации

#### Кнопка "Назад"
- `showBackButton?: boolean` - показывать кнопку назад
- `backButtonText?: string` - текст кнопки назад (по умолчанию "Назад")
- `onBackClick?: () => void` - обработчик кнопки назад

#### Внешний вид
- `pageTitle?: string` - заголовок страницы
- `variant?: 'default' | 'minimal' | 'admin' | 'light'` - вариант отображения
- `className?: string` - дополнительные CSS классы

## Варианты отображения (variant)

### `default` (по умолчанию)
- Полная функциональность
- Градиентный фон purple/indigo
- Белый текст
- Подходит для главной страницы

### `minimal`
- Упрощенный вид
- Полупрозрачный фон
- Белый текст
- Подходит для внутренних страниц

### `admin`
- Административный стиль
- Белый фон
- Темный текст
- Подходит для админ-панели

### `light`
- Для страниц со светлым фоном
- Белый полупрозрачный фон с размытием
- Темный текст
- Хорошо виден на светлых фонах (например, дашборд)

## Автоматические обработчики

Если не передать обработчики, Header использует значения по умолчанию:
- `onLoginClick` → переход на `/auth/signin`
- `onSignOut` → переход на `/api/auth/signout`
- `onCreateClick` → переход на `/`
- `onExamplesClick` → переход на `/examples`
- `onDashboardClick` → переход на `/dashboard`
- `onBackClick` → `router.back()`

## Функциональность

### Адаптивность
- Автоматически адаптируется под мобильные устройства
- Мобильное меню с выпадающим списком
- Оптимизированное отображение на разных экранах

### Мобильное меню
- Открывается под хедером (не полноэкранно)
- Структурированная организация элементов
- Автоматическое закрытие при клике вне меню

### Переключатель языков
- Встроенный компонент `LanguageSwitcher`
- Поддержка украинского и хорватского языков

### Настройки приложения
- Автоматическая загрузка логотипа и названия из админки
- Fallback к значениям по умолчанию

## Примеры интеграции в существующие страницы

### Обновление ServicePage

```tsx
// Заменить существующую навигацию на:
<Header 
  session={session}
  showBackButton={true}
  backButtonText="Главная"
  onBackClick={onBack}
  pageTitle="🎵 Создание поздравления"
  variant="minimal"
/>
```

### Обновление ResultPage

```tsx
<Header 
  session={session}
  showBackButton={true}
  backButtonText="Главная"
  onBackClick={onBack}
  pageTitle="🎵 Ваше поздравление"
  onDashboardClick={onDashboard}
  variant="minimal"
/>
```

### Обновление DashboardPage

```tsx
<Header 
  session={session}
  showBackButton={true}
  backButtonText="Главная"
  onBackClick={onBack}
  pageTitle="📊 Личный кабинет"
  onCreateClick={onCreateClick}
  variant="minimal"
/>
```

## Преимущества использования

1. **Единообразие** - одинаковый интерфейс на всех страницах
2. **Гибкость** - множество вариантов настройки
3. **Адаптивность** - отличная работа на мобильных устройствах
4. **Переиспользование** - один компонент для всех случаев
5. **Легкость обслуживания** - изменения в одном месте

## Миграция существующих страниц

1. Импортировать компонент Header
2. Заменить существующую навигацию на Header
3. Передать необходимые props
4. Удалить дублированный код навигации
5. Протестировать функциональность

Этот подход значительно упрощает поддержку навигации и обеспечивает консистентный пользовательский опыт во всем приложении. 