# 🎵 Spivanka - Персональні музичні привітання

Створюємо унікальні пісні-привітання з якісними римованими текстами та музикою спеціально для ваших рідних і близьких.

## 🚀 Технології

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **База даних**: MongoDB
- **Аутентифікація**: NextAuth.js з Google OAuth
- **AI сервіси**: 
  - Gemini 2.5 Pro (тексти)
  - Suno AI (музика)
  - DALL-E 3 / Stable Diffusion (обкладинки)
- **Платежі**: Fondy (основний), LiqPay (legacy)
- **Календар**: Google Calendar API
- **Деплой**: Vercel, Netlify або інші

## 📋 Функціональність

### ✅ Реалізовано
- [x] Красивий адаптивний UI з анімаціями
- [x] Багатоетапна форма створення привітання
- [x] Інтеграція з Gemini API для генерації текстів
- [x] Інтеграція з Suno API для генерації музики
- [x] Генерація обкладинок через DALL-E/Stable Diffusion
- [x] Система платежів через Fondy
- [x] Аутентифікація через Google OAuth
- [x] MongoDB для збереження даних
- [x] Промокоди та знижки
- [x] Приклади привітань
- [x] Особистий кабінет з історією
- [x] Інтеграція з Google Calendar
- [x] Адмін панель
- [x] Багатомовність (українська, хорватська)
- [x] Система кешування календарних подій
- [x] Автоматична синхронізація календаря

### 🔄 В розробці
- [ ] Email уведомлення
- [ ] Аналітика та статистика
- [ ] Мобільний додаток
- [ ] API для сторонніх інтеграцій

## 🛠️ Встановлення та налаштування

### 1. Клонування репозиторію
```bash
git clone https://github.com/your-username/spivanka.git
cd spivanka
```

### 2. Встановлення залежностей
```bash
npm install
```

### 3. Налаштування змінних середовища
Скопіюйте файл `env.example` в `.env.local` та заповніть необхідні значення:

```bash
cp env.example .env.local
```

#### Обов'язкові змінні:
```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# MongoDB
MONGODB_URI=mongodb://localhost:27017/spivanka

# AI Services
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUNO_API_KEY=your-suno-api-key
NEXT_PUBLIC_SUNO_CALLBACK_URL=https://webhook.site/your-webhook-id

# Платежі
FONDY_MERCHANT_ID=your_merchant_id
FONDY_SECRET_KEY=your_secret_key

# Шифрування
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

#### Опціональні змінні:
```env
# Обкладинки
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_REPLICATE_API_KEY=your-replicate-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Legacy LiqPay
LIQPAY_PUBLIC_KEY=your-liqpay-public-key
LIQPAY_PRIVATE_KEY=your-liqpay-private-key
```

### 4. Отримання API ключів

#### Google OAuth
1. Перейдіть до [Google Cloud Console](https://console.cloud.google.com/)
2. Створіть новий проект або виберіть існуючий
3. Увімкніть Google+ API та Google Calendar API
4. Створіть OAuth 2.0 credentials
5. Додайте `http://localhost:3000/api/auth/callback/google` в Authorized redirect URIs

#### Gemini API
1. Перейдіть до [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Створіть API ключ
3. Скопіюйте ключ в `NEXT_PUBLIC_GEMINI_API_KEY`

#### Suno API
1. Зареєструйтесь на [Suno AI](https://suno.ai/)
2. Отримайте API ключ
3. Скопіюйте ключ в `NEXT_PUBLIC_SUNO_API_KEY`
4. Налаштуйте webhook URL в `NEXT_PUBLIC_SUNO_CALLBACK_URL`

#### MongoDB
1. Створіть кластер на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Отримайте connection string
3. Скопіюйте в `MONGODB_URI`

### 5. Запуск в режимі розробки
```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000) у браузері.

## 🏗️ Структура проекту

```
spivanka/
├── app/                    # Next.js App Router
│   ├── api/               # API роути
│   │   ├── auth/          # NextAuth роути
│   │   ├── calendar/      # Google Calendar API
│   │   ├── generate/      # AI генерація
│   │   ├── greetings/     # Привітання
│   │   ├── payment/       # Платежі
│   │   └── admin/         # Адмін панель
│   ├── globals.css        # Глобальні стилі
│   ├── layout.tsx         # Корневий layout
│   └── page.tsx           # Головна сторінка
├── components/            # React компоненти
│   ├── modals/           # Модальні вікна
│   ├── pages/            # Сторінки
│   ├── providers/        # Провайдери контексту
│   └── MusicGreetingService.tsx # Основний компонент
├── hooks/                # Кастомні хуки
├── lib/                  # Утиліти та конфігурація
├── services/             # Сервіси для API
├── types/                # TypeScript типи
├── locales/              # Багатомовність
├── scripts/              # Скрипти для адміністрації
├── public/               # Статичні файли
└── package.json          # Залежності
```

## 🔧 API Endpoints

### Аутентифікація
- `GET/POST /api/auth/[...nextauth]` - NextAuth роути
- `GET /api/auth/calendar/status` - Статус календаря

### Генерація контенту
- `POST /api/generate/text` - Генерація тексту через Gemini
- `POST /api/generate/music` - Генерація музики через Suno
- `POST /api/generate/cover` - Генерація обкладинки

### Календар
- `GET /api/calendar/events` - Отримання подій календаря
- `POST /api/calendar/cache` - Синхронізація календаря
- `DELETE /api/calendar/cache/clear` - Очищення кешу

### Платежі
- `POST /api/payment/create-session` - Створення платежної сесії
- `POST /api/payment/fondy/callback` - Callback Fondy
- `POST /api/payment/liqpay/callback` - Callback LiqPay

### Привітання
- `GET /api/greetings` - Отримання привітань користувача
- `POST /api/greetings` - Збереження привітання
- `PUT /api/greetings/[id]` - Оновлення привітання
- `DELETE /api/greetings/[id]` - Видалення привітання

### Адмін панель
- `GET /api/admin/settings` - Налаштування
- `GET /api/admin/stats` - Статистика
- `GET /api/admin/promocodes` - Промокоди

## 🎨 Кастомізація

### Стилі
Проект використовує Tailwind CSS. Основні кольори та анімації можна змінити в:
- `tailwind.config.js` - конфігурація Tailwind
- `app/globals.css` - глобальні стилі

### Тексти
Всі тексти знаходяться в компонентах. Для інтернаціоналізації:
- `locales/uk.json` - українська мова
- `locales/hr.json` - хорватська мова

### AI промпти
Промпти для генерації можна налаштувати в:
- `services/geminiService.ts` - промпти для текстів
- `services/sunoService.ts` - промпти для музики
- `services/coverArtService.ts` - промпти для обкладинок

## 🚀 Деплой

### Vercel (рекомендовано)
1. Підключіть репозиторій до Vercel
2. Додайте змінні середовища в налаштуваннях
3. Деплой відбудеться автоматично

### Netlify
1. Підключіть репозиторій до Netlify
2. Налаштуйте build команду: `npm run build`
3. Додайте змінні середовища

### Self-hosted
```bash
npm run build
npm start
```

## 📊 Моніторинг та аналітика

### Логи
- Всі API запити логуються в консоль
- Помилки зберігаються в MongoDB
- Аналітика через адмін панель

### База даних
- Автоматичне очищення старих даних
- Скрипти для міграції: `scripts/clean-database.js`

## 🤝 Внесок

1. Fork репозиторію
2. Створіть feature branch (`git checkout -b feature/amazing-feature`)
3. Commit зміни (`git commit -m 'Add amazing feature'`)
4. Push до branch (`git push origin feature/amazing-feature`)
5. Відкрийте Pull Request

## 📄 Ліцензія

Цей проект ліцензований під MIT License - дивіться файл [LICENSE](LICENSE) для деталей.

## 📞 Підтримка

- Email: support@spivanka.com
- Telegram: @spivanka_support
- GitHub Issues: [Створити issue](https://github.com/your-username/spivanka/issues)

## 🙏 Подяки

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Google AI](https://ai.google.dev/) - Gemini API
- [Suno AI](https://suno.ai/) - Музична генерація
- [MongoDB](https://www.mongodb.com/) - База даних
- [Fondy](https://fondy.eu/) - Платежі 