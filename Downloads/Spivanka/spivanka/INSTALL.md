# 🚀 Інструкції з встановлення Spivanka

## Швидкий старт

### 1. Клонування та встановлення
```bash
git clone https://github.com/your-username/spivanka.git
cd spivanka
npm install
```

### 2. Налаштування змінних середовища
```bash
cp env.example .env.local
```

### 3. Заповнення .env.local
```env
# Обов'язкові змінні
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUNO_API_KEY=your-suno-api-key
```

### 4. Запуск
```bash
npm run dev
```

## 📋 Детальні інструкції

### Отримання API ключів

#### 1. Google OAuth (обов'язково)
1. Перейдіть до [Google Cloud Console](https://console.cloud.google.com/)
2. Створіть новий проект або виберіть існуючий
3. Увімкніть Google+ API:
   - Перейдіть до "APIs & Services" > "Library"
   - Знайдіть "Google+ API" та увімкніть його
4. Створіть OAuth 2.0 credentials:
   - Перейдіть до "APIs & Services" > "Credentials"
   - Натисніть "Create Credentials" > "OAuth 2.0 Client IDs"
   - Виберіть "Web application"
   - Додайте Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (для розробки)
     - `https://yourdomain.com/api/auth/callback/google` (для продакшену)
5. Скопіюйте Client ID та Client Secret в .env.local

#### 2. Gemini API (обов'язково)
1. Перейдіть до [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Увійдіть з Google акаунтом
3. Натисніть "Create API Key"
4. Скопіюйте ключ в `NEXT_PUBLIC_GEMINI_API_KEY`

#### 3. Suno API (обов'язково)
1. Зареєструйтесь на [Suno AI](https://suno.ai/)
2. Перейдіть до налаштувань акаунта
3. Знайдіть розділ API Keys
4. Створіть новий API ключ
5. Скопіюйте ключ в `NEXT_PUBLIC_SUNO_API_KEY`

#### 4. OpenAI API (опціонально, для обкладинок)
1. Перейдіть до [OpenAI Platform](https://platform.openai.com/api-keys)
2. Увійдіть або створіть акаунт
3. Натисніть "Create new secret key"
4. Скопіюйте ключ в `NEXT_PUBLIC_OPENAI_API_KEY`

#### 5. Replicate API (опціонально, альтернатива для обкладинок)
1. Зареєструйтесь на [Replicate](https://replicate.com/)
2. Перейдіть до налаштувань акаунта
3. Створіть API токен
4. Скопіюйте токен в `NEXT_PUBLIC_REPLICATE_API_KEY`

### Налаштування бази даних

#### MongoDB Atlas (рекомендовано)
1. Створіть акаунт на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Створіть новий кластер (безкоштовний план)
3. Створіть користувача бази даних
4. Отримайте connection string
5. Додайте в .env.local:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spivanka
   ```

#### Локальна MongoDB
1. Встановіть MongoDB на ваш комп'ютер
2. Запустіть MongoDB сервіс
3. Додайте в .env.local:
   ```env
   MONGODB_URI=mongodb://localhost:27017/spivanka
   ```

### Налаштування платежів

#### Fondy (рекомендовано)
1. Створіть акаунт на [Fondy](https://fondy.eu/)
2. Отримайте Merchant ID та Secret Key
3. Додайте в .env.local:
   ```env
   FONDY_MERCHANT_ID=your_merchant_id
   FONDY_SECRET_KEY=your_secret_key
   ```

#### LiqPay (альтернатива)
1. Створіть акаунт на [LiqPay](https://www.liqpay.ua/)
2. Отримайте Public Key та Private Key
3. Додайте в .env.local:
   ```env
   LIQPAY_PUBLIC_KEY=your_public_key
   LIQPAY_PRIVATE_KEY=your_private_key
   ```

## 🔧 Розробка

### Структура проекту
```
spivanka/
├── app/                    # Next.js App Router
│   ├── api/               # API роути
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
└── package.json          # Залежності
```

### Доступні команди
```bash
npm run dev          # Запуск в режимі розробки
npm run build        # Збірка для продакшену
npm run start        # Запуск продакшен версії
npm run lint         # Перевірка коду
```

### Налаштування TypeScript
Проект використовує TypeScript. Всі типи знаходяться в папці `types/`.

### Налаштування Tailwind CSS
Стилі налаштовані в `tailwind.config.js`. Додаткові анімації в `app/globals.css`.

## 🚀 Деплой

### Vercel (рекомендовано)
1. Підключіть GitHub репозиторій до Vercel
2. Додайте змінні середовища в налаштуваннях проекту
3. Деплой відбудеться автоматично при пуші в main branch

### Netlify
1. Підключіть GitHub репозиторій до Netlify
2. Налаштуйте build команду: `npm run build`
3. Додайте змінні середовища
4. Налаштуйте publish directory: `.next`

### Self-hosted
```bash
npm run build
npm start
```

## 🔒 Безпека

### Змінні середовища
- Ніколи не комітьте .env.local файл
- Використовуйте різні ключі для розробки та продакшену
- Регулярно оновлюйте API ключі

### API ключі
- Обмежте доступ до API ключів
- Використовуйте rate limiting
- Моніторьте використання API

### База даних
- Використовуйте сильні паролі
- Обмежте доступ до бази даних
- Регулярно робіть бекапи

## 🐛 Вирішення проблем

### Помилка "Module not found"
```bash
npm install
npm run dev
```

### Помилка з API ключами
1. Перевірте правильність API ключів
2. Переконайтеся, що ключі активні
3. Перевірте ліміти використання

### Помилка з MongoDB
1. Перевірте connection string
2. Переконайтеся, що MongoDB запущена
3. Перевірте мережеві налаштування

### Помилка з NextAuth
1. Перевірте Google OAuth налаштування
2. Переконайтеся, що redirect URIs правильні
3. Перевірте NEXTAUTH_SECRET

## 📞 Підтримка

Якщо у вас є проблеми:
1. Перевірте цю документацію
2. Подивіться Issues в GitHub
3. Створіть новий Issue з детальним описом проблеми

## 🔄 Оновлення

Для оновлення проекту:
```bash
git pull origin main
npm install
npm run build
```

---

Удачі з вашим проектом! 🎵 