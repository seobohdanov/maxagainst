# 🔄 Міграція з LiqPay на Fondy

## Огляд змін

Проект Spivanka було успішно переведено з LiqPay на Fondy для обробки платежів. Fondy пропонує кращу інтеграцію, більше методів оплати та зручний віджет для українських користувачів.

## 🚀 Що змінилося

### ✅ Нові компоненти
- `components/modals/FondyModal.tsx` - новий модальний компонент для Fondy
- `app/api/payment/fondy/route.ts` - API endpoint для створення платежів
- `app/api/payment/fondy/callback/route.ts` - callback для обробки уведомлень від Fondy

### 🔄 Оновлені файли
- `components/modals/PaymentModal.tsx` - замінено LiqPay на Fondy
- `services/paymentService.ts` - оновлено для роботи з Fondy API
- `types/index.ts` - додано підтримку `fondy` в PaymentMethod та `fondyData` в Payment
- `components/pages/DashboardPage.tsx` - оновлено відображення платежів
- `app/api/greetings/auto-save/route.ts` - метод платежу за замовчуванням змінено на `fondy`

### 📝 Документація
- `README.md` - оновлено інформацію про налаштування Fondy
- `INSTALL.md` - додано інструкції з налаштування Fondy
- `env.example` - додано змінні для Fondy

## ⚙️ Налаштування

### 1. Змінні середовища
Додайте в `.env.local`:
```env
# Fondy Payment Settings
FONDY_MERCHANT_ID=your_merchant_id
FONDY_SECRET_KEY=your_secret_key
```

### 2. Отримання ключів Fondy
1. Зареєструйтесь на [Fondy](https://fondy.eu/)
2. Створіть мерчант акаунт
3. Отримайте Merchant ID та Secret Key в особистому кабінеті
4. Налаштуйте callback URL: `https://yourdomain.com/api/payment/fondy/callback`

## 🔧 Технічні деталі

### Віджет Fondy
```javascript
window.fondy("#fondy-ua-checkout", {
  options: {
    methods: ['card', 'banklinks_eu', 'local_methods'],
    default_country: 'UA',
    button: true
  },
  params: {
    merchant_id: 1397120,
    amount: 59900, // в копійках
    currency: 'UAH',
    order_desc: 'Музичне привітання',
    order_id: 'order_123',
    response_url: 'https://yourdomain.com/payment/success',
    server_callback_url: 'https://yourdomain.com/api/payment/fondy/callback',
    signature: 'calculated_signature'
  },
  messages: {
    ua: { 
      card_number: 'Номер карти',
      order_desc: 'Опис замовлення'
    }
  }
})
```

### Створення підпису
```javascript
function createFondySignature(data, secretKey) {
  const sortedKeys = Object.keys(data).sort()
  const signatureString = sortedKeys
    .map(key => `${key}=${data[key]}`)
    .join('|')
  
  const stringToSign = `${secretKey}|${signatureString}`
  return crypto.createHash('sha1').update(stringToSign).digest('hex')
}
```

### Callback обробка
```javascript
// POST /api/payment/fondy/callback
{
  "order_id": "order_123",
  "order_status": "approved", // approved, declined, processing
  "amount": 59900,
  "currency": "UAH",
  "payment_id": "12345",
  "signature": "calculated_signature"
}
```

## 🔍 Статуси платежів

### Fondy → Наші статуси
- `approved` → `success`
- `declined`, `expired`, `reversed` → `failed`
- `processing`, `created` → `pending`

## 🎯 Переваги Fondy

### ✅ Що покращилося
1. **Кращий віджет** - сучасний UI/UX для українських користувачів
2. **Більше методів оплати** - карти, банківські переказі, локальні методи
3. **Простіша інтеграція** - менше коду, більше можливостей
4. **Краща підтримка** - українська локалізація та підтримка
5. **Надійність** - стабільна робота та швидка обробка

### 📊 Методи оплати
- 💳 Банківські карти (Visa, MasterCard, Prostir)
- 🏦 Банківські перекази
- 📱 Google Pay, Apple Pay
- 🇺🇦 Локальні українські методи

## 🔄 Зворотна сумісність

### LiqPay підтримка
Старі LiqPay компоненти залишено для зворотної сумісності:
- `components/modals/LiqPayEmbedModal.tsx`
- `app/api/payment/liqpay/`

### Міграція існуючих платежів
Всі існуючі платежі в базі даних залишаються без змін. Нові платежі створюються з `paymentMethod: 'fondy'`.

## 🧪 Тестування

### Тестова сторінка
Для перевірки віджету Fondy створена спеціальна тестова сторінка:
```
http://localhost:3000/test-fondy
```

### Локальна розробка
```bash
# Запуск додатка
npm run dev

# Тестування API
curl -X POST "http://localhost:3000/api/payment/fondy" \
  -H "Content-Type: application/json" \
  -d '{"amount": 599, "description": "Test", "orderId": "test123"}'
```

### Демо режим
В локальній розробці (HTTP) автоматично включається демо режим з симуляцією платежів.

### Реальний віджет
Для тестування реального віджету Fondy потрібно:
1. Налаштувати HTTPS (використовуйте ngrok або mkcert)
2. Додати реальні ключі Fondy в `.env.local`
3. Налаштувати callback URL в особистому кабінеті Fondy

### Тестові картки Fondy
Для тестування в sandbox режимі використовуйте:
- **Успішна оплата**: 4444 5555 6666 1111
- **Відхилена оплата**: 4444 1111 1111 1118
- **Термін дії**: будь-яка майбутня дата
- **CVV**: будь-які 3 цифри

## 📈 Моніторинг

### Логи платежів
```bash
# Перевірка статистики
npm run db:stats

# Очистка тестових даних
npm run db:clean
```

### Відстеження платежів
Всі платежі Fondy зберігаються в колекції `payments` з полем `fondyData` для повної інформації від Fondy.

## 🚨 Важливі зауваження

### Безпека
1. **Секретний ключ** - ніколи не виставляйте FONDY_SECRET_KEY публічно
2. **Перевірка підпису** - завжди перевіряйте підпис в callback
3. **HTTPS** - використовуйте тільки HTTPS в продакшені

### Продакшен
1. Замініть тестові ключі на реальні
2. Налаштуйте правильні callback URL
3. Увімкніть логування та моніторинг

## 📞 Підтримка

### Fondy
- Документація: https://docs.fondy.eu/
- Підтримка: https://fondy.eu/support/

### Проект
- GitHub Issues для технічних питань
- Документація в `/docs` папці

---

🎉 **Міграція завершена успішно!** Fondy готовий до використання в продакшені.
