# 🧹 Очистка базы данных Spivanka

## Обзор

Для безопасного тестирования приложения создан скрипт очистки базы данных MongoDB, который позволяет удалять различные типы данных без риска повредить важные настройки.

## Быстрый старт

### Показать статистику базы данных
```bash
npm run db:stats
```

### Очистить тестовые данные (рекомендовано)
```bash
npm run db:clean
```

### Полная очистка кроме настроек
```bash
npm run db:clean-all
```

### Очистить только незавершенные генерации
```bash
npm run db:clean-incomplete
```

## Подробные опции

### 1. Тестовые данные (безопасно)
```bash
node scripts/clean-database.js 1
# или
npm run db:clean
```
**Удаляет:**
- ✅ Привітання пользователей
- ✅ Статусы генерации музыки
- ✅ Callback'и от Suno API

**Сохраняет:**
- ✅ Настройки админа (цены, режим обслуживания)
- ✅ Платежи

### 2. Все кроме настроек
```bash
node scripts/clean-database.js 2
# или
npm run db:clean-all
```
**Удаляет:**
- ✅ Привітання пользователей
- ✅ Статусы генерации музыки
- ✅ Callback'и от Suno API
- ✅ Платежи

**Сохраняет:**
- ✅ Настройки админа

### 3. Полная очистка ⚠️ ОСТОРОЖНО!
```bash
node scripts/clean-database.js 3
```
**Удаляет ВСЕ включая настройки админа!**

### 4. Только незавершенные генерации
```bash
node scripts/clean-database.js 4
# или
npm run db:clean-incomplete
```
**Удаляет только записи со статусом:**
- PENDING
- TEXT_SUCCESS
- FIRST_SUCCESS
- ERROR
- FAILED

### 5. Старые данные (7+ дней)
```bash
node scripts/clean-database.js 5
```

### 6. Показать статистику
```bash
node scripts/clean-database.js 6
# или
npm run db:stats
```

## Структура базы данных

### Коллекции MongoDB

| Коллекция | Описание | Безопасно удалять |
|-----------|----------|-------------------|
| `greetings` | Основные привітання пользователей | ✅ Да |
| `generation_status` | Статусы генерации музыки | ✅ Да |
| `suno_callbacks` | Callback'и от Suno API | ✅ Да |
| `payments` | Информация о платежах | ⚠️ Осторожно |
| `settings` | Настройки приложения | ❌ Лучше сохранить |

### Важные настройки в `settings`
- Цены планов (basicPlanPrice, premiumPlanPrice)
- Название приложения (appName)
- Режим обслуживания (maintenanceMode)
- Логотип приложения (appLogo)

## Сценарии использования

### 🔄 Начать тестирование с чистого листа
```bash
npm run db:clean
```
Это удалит все пользовательские данные, но сохранит настройки цен и другие важные конфигурации.

### 🏭 Подготовка к продакшену
```bash
npm run db:clean-all
```
Очистит все данные кроме настроек админа.

### 🧪 Очистка после неудачных тестов
```bash
npm run db:clean-incomplete
```
Удалит только незавершенные или ошибочные генерации.

### 📊 Мониторинг состояния
```bash
npm run db:stats
```
Покажет детальную статистику по всем коллекциям.

## Безопасность

- ✅ Скрипт показывает статистику перед удалением
- ✅ Все операции логируются
- ✅ Можно выбрать что именно удалять
- ✅ Настройки админа можно сохранить
- ✅ Поддержка переменных окружения из .env.local

## Восстановление после очистки

### Автоматическое восстановление
1. **Настройки админа** - восстанавливаются автоматически если сохранены
2. **Дефолтные цены** - используются если настройки удалены (100₴/200₴)

### Ручное восстановление
1. Перейти в админ-панель `/admin`
2. Настроить цены планов
3. Настроить другие параметры приложения

## Примеры вывода

### Статистика перед очисткой
```
📊 Поточна статистика бази даних:
   greetings: 27 документів
   generation_status: 100 документів
   payments: 0 документів
   settings: 1 документів
   suno_callbacks: 0 документів

🎵 Привітання по статусах:
   SUCCESS: 6
   undefined: 21

👥 Унікальних користувачів: 5
🌐 Публічних привітань: 3

⚙️  Налаштування додатка:
   Назва: Spivanka
   Базовий план: 599 ₴
   Преміум план: 200 ₴
   Режим обслуговування: НІ
```

### Результат очистки
```
🧹 Очищення тестових даних...
✅ Видалено 27 привітань
✅ Видалено 100 статусів генерації
✅ Видалено 0 callback'ів
✅ Тестові дані очищено! Налаштування та платежі збережено.
```

## Поддержка

При возникновении проблем:
1. Проверьте подключение к MongoDB
2. Убедитесь что .env.local содержит правильный MONGODB_URI
3. Проверьте права доступа к базе данных

## Changelog

- **v1.0** - Базовый функционал очистки
- **v1.1** - Добавлена поддержка dotenv
- **v1.2** - Добавлены npm scripts для удобства
- **v1.3** - Улучшена статистика и безопасность

## Database Cleanup and Security

### Data Encryption

#### Overview
Personal data in the application is encrypted before storage in MongoDB. The following fields are encrypted:
- `recipientName` - Name of the person being greeted
- `personalDetails` - Personal details and preferences
- `relationship` - Relationship information
- `text` - Generated greeting text

#### Encryption Setup

1. **Generate Encryption Key:**
   ```bash
   node scripts/generate-encryption-key.js
   ```

2. **Add to Environment:**
   Add the generated key to your `.env.local` file:
   ```
   ENCRYPTION_KEY=your-generated-key-here
   ```

3. **Security Notes:**
   - Never commit the encryption key to git
   - Store the key securely in production
   - Rotate keys periodically in production

#### Encryption Implementation

The encryption uses AES-256-CBC with:
- Random IV for each encryption
- Hex encoding for storage
- Automatic fallback to plain text if decryption fails

#### Data Access

When data is retrieved from the database:
1. Encrypted fields are automatically decrypted
2. Plain text fields remain unchanged
3. The application handles both encrypted and unencrypted data seamlessly

### Database Cleanup

#### Manual Cleanup Script

Run the cleanup script to remove old data:

```bash
node scripts/clean-database.js
```

#### Automatic Cleanup

The system automatically:
- Removes greetings older than 30 days
- Cleans up failed generation attempts
- Removes expired calendar cache entries

#### Data Export

Users can export their data including:
- Profile information
- All greetings (decrypted)
- Payment history
- Calendar connection status

The export is provided as a JSON file with all personal data decrypted for user access.

### Security Considerations

1. **Encryption at Rest:** Personal data is encrypted before storage
2. **Access Control:** Data is isolated by user email
3. **Data Export:** Users can export their data in readable format
4. **Data Deletion:** Complete account deletion removes all user data
5. **Audit Trail:** All data operations are logged for security

### Production Deployment

For production deployment:

1. Generate a unique encryption key
2. Store the key securely (environment variables)
3. Ensure MongoDB connection uses TLS
4. Enable MongoDB authentication
5. Configure proper backup procedures
6. Monitor data access logs

### Troubleshooting

#### Encryption Issues

If you encounter encryption errors:

1. Check that `ENCRYPTION_KEY` is set correctly
2. Ensure the key is 32 characters (64 hex characters)
3. Restart the application after changing the key
4. Check logs for encryption/decryption errors

#### Data Migration

When migrating existing data:

1. Export all data before changes
2. Test encryption with a small dataset
3. Verify decryption works correctly
4. Monitor performance impact

### Compliance

This implementation helps with:
- GDPR compliance (data encryption)
- Right to be forgotten (complete deletion)
- Data portability (export functionality)
- Privacy by design (automatic encryption)
