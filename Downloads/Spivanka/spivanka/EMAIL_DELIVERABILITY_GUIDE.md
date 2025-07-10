# Руководство по доставке email и предотвращению спама

## Обзор

Это руководство описывает, как правильно настроить систему email-рассылок для максимальной доставки и предотвращения попадания в спам.

## Технические требования

### 1. Настройка DNS записей

#### SPF запись
```
v=spf1 include:_spf.google.com ~all
```

#### DKIM запись
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

#### DMARC запись
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; sp=quarantine; adkim=r; aspf=r;
```

### 2. Настройка SMTP

В файле `.env` добавьте:

```env
# SMTP настройки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# DKIM настройки
DOMAIN_NAME=yourdomain.com
DKIM_SELECTOR=default
DKIM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

# Email настройки
FROM_EMAIL=noreply@yourdomain.com
UNSUBSCRIBE_SECRET=your-secret-key
```

### 3. Установка зависимостей

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Лучшие практики для предотвращения спама

### 1. Проверка согласий

```typescript
// Всегда проверяем согласие перед отправкой
const hasConsent = await emailService.checkMarketingConsent(email)
if (!hasConsent) {
  console.log(`Пропускаю ${email} - немає згоди`)
  return
}
```

### 2. Правильные заголовки

```typescript
headers: {
  'List-Unsubscribe': `<${process.env.DOMAIN_NAME}/unsubscribe?token=${token}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  'Precedence': 'bulk',
  'X-Auto-Response-Suppress': 'OOF, AutoReply'
}
```

### 3. Ссылка отписки

```typescript
// Обязательно добавляем ссылку отписки
const unsubscribeHtml = `
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
    <p>Це письмо надіслано користувачам, які погодилися отримувати маркетингові матеріали.</p>
    <p><a href="${process.env.DOMAIN_NAME}/unsubscribe?token=${token}">Відписатися від розсилки</a></p>
  </div>
`
```

### 4. Паузы между отправками

```typescript
// Пауза между отправками для предотвращения спама
await new Promise(resolve => setTimeout(resolve, 100))
```

### 5. Логирование отправок

```typescript
// Логируем все отправки для аудита
await emailLogCollection.insertOne({
  email: email.toLowerCase(),
  type: 'marketing',
  sentAt: new Date(),
  ipAddress: 'system'
})
```

## Настройка Gmail для рассылок

### 1. Создание App Password

1. Включите двухфакторную аутентификацию
2. Создайте App Password для приложения
3. Используйте App Password вместо обычного пароля

### 2. Настройка DKIM

```bash
# Генерация DKIM ключа
openssl genrsa -out dkim_private.pem 2048
openssl rsa -in dkim_private.pem -pubout -out dkim_public.pem
```

### 3. Настройка DNS записей в Gmail

1. Перейдите в Google Workspace Admin
2. Настройте SPF, DKIM и DMARC записи
3. Подождите 24-48 часов для распространения

## Мониторинг доставки

### 1. Отслеживание открытий

```typescript
// Добавляем пиксель для отслеживания открытий
const trackingPixel = `<img src="${process.env.DOMAIN_NAME}/api/track-open?email=${encodeURIComponent(email)}" width="1" height="1" style="display:none;" />`
```

### 2. Отслеживание кликов

```typescript
// Оборачиваем ссылки для отслеживания кликов
const trackedLink = `${process.env.DOMAIN_NAME}/api/track-click?url=${encodeURIComponent(originalUrl)}&email=${encodeURIComponent(email)}`
```

### 3. Анализ отказов

```typescript
// Обрабатываем отказы
const handleBounce = async (email: string, reason: string) => {
  await consentCollection.updateOne(
    { email },
    { 
      $set: { 
        'marketingConsent.agreed': false,
        'marketingConsent.bouncedAt': new Date(),
        'marketingConsent.bounceReason': reason
      }
    }
  )
}
```

## Тестирование доставки

### 1. Проверка в разных почтовых клиентах

- Gmail
- Outlook
- Apple Mail
- Thunderbird

### 2. Проверка в спам-фильтрах

- SpamAssassin
- Barracuda
- Proofpoint

### 3. Инструменты для тестирования

- Mail Tester
- GlockApps
- 250ok

## Обработка отписок

### 1. Немедленная обработка

```typescript
// При отписке сразу обновляем статус
await consentCollection.updateOne(
  { email: user.email },
  { 
    $set: {
      'marketingConsent.agreed': false,
      'marketingConsent.withdrawnAt': new Date()
    }
  }
)
```

### 2. Уведомление админа

```typescript
// Уведомляем админа об отписке
await emailService.sendTransactionalEmail(
  'admin@yourdomain.com',
  {
    subject: 'Користувач відписався від розсилки',
    html: `<p>Користувач ${email} відписався від маркетингової розсилки</p>`
  }
)
```

## Соответствие GDPR

### 1. Право на забвение

```typescript
// Полное удаление данных по запросу
const deleteUserData = async (email: string) => {
  await consentCollection.deleteOne({ email })
  await emailLogCollection.deleteMany({ email })
}
```

### 2. Экспорт данных

```typescript
// Экспорт данных пользователя
const exportUserData = async (email: string) => {
  const consents = await consentCollection.find({ email }).toArray()
  const logs = await emailLogCollection.find({ email }).toArray()
  
  return {
    consents,
    emailLogs: logs,
    exportedAt: new Date()
  }
}
```

### 3. Аудит согласий

```typescript
// Полная история согласий
const consentHistory = await consentCollection.find({ 
  email 
}).sort({ createdAt: -1 }).toArray()
```

## Мониторинг репутации

### 1. Проверка IP репутации

- SenderScore
- Barracuda Reputation
- Microsoft SNDS

### 2. Мониторинг отказов

```typescript
// Отслеживаем процент отказов
const bounceRate = (bounces / totalSent) * 100
if (bounceRate > 5) {
  console.warn('Високий відсоток відмов - перевірте список')
}
```

### 3. Обработка жалоб

```typescript
// При жалобе на спам
const handleSpamComplaint = async (email: string) => {
  await consentCollection.updateOne(
    { email },
    { 
      $set: { 
        'marketingConsent.agreed': false,
        'marketingConsent.spamComplaintAt': new Date()
      }
    }
  )
}
```

## Рекомендации по контенту

### 1. Избегайте спам-слов

- "Бесплатно"
- "Срочно"
- "Ограниченное время"
- "Гарантированно"

### 2. Правильная структура

- Четкий subject
- Имя отправителя
- Физический адрес
- Ссылка отписки

### 3. Персонализация

```typescript
// Персонализируем письма
const personalizedContent = content.replace(
  /{name}/g, 
  user.name || 'Користувач'
)
```

## Заключение

Следуя этим рекомендациям, вы значительно повысите вероятность доставки email в папку "Входящие" и избежите попадания в спам. Регулярно мониторьте статистику доставки и корректируйте настройки при необходимости. 