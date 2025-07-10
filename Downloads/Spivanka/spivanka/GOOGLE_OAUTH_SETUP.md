# Настройка Google OAuth для календарной интеграции

## Проблема: redirect_uri_mismatch

Эта ошибка возникает, когда redirect URI в запросе не совпадает с настройками в Google Cloud Console.

## Решение

### 1. Откройте Google Cloud Console
- Перейдите на https://console.cloud.google.com/
- Выберите ваш проект

### 2. Настройте OAuth 2.0 Client
- Перейдите в **APIs & Services** → **Credentials**
- Найдите ваш OAuth 2.0 Client ID
- Нажмите на него для редактирования

### 3. Добавьте Redirect URIs

В разделе **Authorized redirect URIs** добавьте:

**Для локальной разработки:**
```
http://localhost:3000/api/auth/calendar/callback
```

**Для продакшена:**
```
https://your-domain.com/api/auth/calendar/callback
```

### 4. Сохраните изменения

Нажмите **Save** и подождите несколько минут для применения изменений.

## Текущие URI в системе

Система использует следующие redirect URI:

- **Основная авторизация NextAuth**: `${NEXTAUTH_URL}/api/auth/callback/google`
- **Авторизация календаря**: `${NEXTAUTH_URL}/api/auth/calendar/callback`

## Переменные окружения

Убедитесь, что в `.env.local` правильно настроена переменная:

```env
NEXTAUTH_URL=http://localhost:3000  # для разработки
# или
NEXTAUTH_URL=https://your-domain.com  # для продакшена
```

## Проверка настроек

После настройки проверьте логи сервера - должны появиться сообщения:
```
📅 Redirect URI: http://localhost:3000/api/auth/calendar/callback
```

## Альтернативное решение

Если не хотите изменять настройки Google Cloud Console, можно использовать существующий callback NextAuth, но это потребует дополнительной настройки. 