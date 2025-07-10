# Руководство по деплою на VPS

## 🖥️ Рекомендуемые VPS провайдеры

### Бюджетные варианты:
- **Hetzner Cloud CX11:** €4.15/месяц (2GB RAM, 1 CPU, 20GB SSD)
- **DigitalOcean Basic:** $6/месяц (1GB RAM, 1 CPU, 25GB SSD)
- **Vultr Cloud Compute:** $6/месяц (1GB RAM, 1 CPU, 25GB SSD)

### Оптимальный вариант:
- **DigitalOcean Standard:** $12/месяц (2GB RAM, 1 CPU, 50GB SSD)

## 📋 Требования к серверу

### Минимальные:
- **CPU:** 1 ядро
- **RAM:** 1GB (рекомендуется 2GB)
- **Storage:** 20GB SSD
- **OS:** Ubuntu 22.04 LTS

### Рекомендуемые:
- **CPU:** 2 ядра
- **RAM:** 2GB
- **Storage:** 50GB SSD
- **Network:** 1TB трафика/месяц

## 🗄️ База данных

### Вариант 1: MongoDB Atlas (рекомендуется)
- **Free Tier:** 512MB RAM, 0.5GB storage
- **Shared Cluster:** $9/месяц (2GB RAM, 10GB storage)
- **Преимущества:** Автоматические бэкапы, мониторинг

### Вариант 2: MongoDB на VPS
- **Плюсы:** Дешевле, полный контроль
- **Минусы:** Нужно настраивать бэкапы

## 🚀 Пошаговый деплой

### 1. Подготовка приложения

```bash
# Создайте production build
npm run build

# Проверьте, что все работает локально
npm start
```

### 2. Настройка VPS

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Обновите систему
apt update && apt upgrade -y

# Установите необходимые пакеты
apt install -y curl wget git nginx certbot python3-certbot-nginx

# Установите Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Установите PM2 для управления процессами
npm install -g pm2
```

### 3. Настройка MongoDB Atlas

1. Создайте аккаунт на [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Создайте бесплатный кластер
3. Настройте Network Access (добавьте IP вашего VPS)
4. Создайте пользователя базы данных
5. Получите connection string

### 4. Настройка приложения

```bash
# Клонируйте репозиторий
git clone https://github.com/your-username/spivanka.git
cd spivanka

# Установите зависимости
npm install

# Создайте .env файл
cp env.example .env
nano .env
```

### 5. Конфигурация .env

```env
# Production settings
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spivanka

# Google OAuth (production)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret

# AI Services
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_SUNO_API_KEY=your-suno-key
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-key

# Payment Services
FONDY_MERCHANT_ID=your-production-merchant-id
FONDY_SECRET_KEY=your-production-secret-key

# Data Encryption
ENCRYPTION_KEY=your-production-encryption-key

# Email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 6. Сборка и запуск

```bash
# Соберите приложение
npm run build

# Запустите с PM2
pm2 start npm --name "spivanka" -- start

# Сохраните конфигурацию PM2
pm2 save
pm2 startup
```

### 7. Настройка Nginx

```bash
# Создайте конфигурацию Nginx
sudo nano /etc/nginx/sites-available/spivanka
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Активируйте сайт
sudo ln -s /etc/nginx/sites-available/spivanka /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL сертификат

```bash
# Установите SSL с Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 9. Настройка домена

1. Купите домен (например, на Namecheap или GoDaddy)
2. Настройте A-запись на IP вашего VPS
3. Подождите обновления DNS (до 24 часов)

## 🔧 Мониторинг и обслуживание

### Полезные команды:

```bash
# Проверить статус приложения
pm2 status

# Посмотреть логи
pm2 logs spivanka

# Перезапустить приложение
pm2 restart spivanka

# Обновить приложение
git pull
npm install
npm run build
pm2 restart spivanka
```

### Автоматические бэкапы:

```bash
# Создайте скрипт для бэкапа MongoDB
nano /root/backup-mongo.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your-mongodb-uri" --out="/backups/mongo_$DATE"
```

## 💰 Оценка стоимости

### Бюджетный вариант:
- **VPS:** €4.15/месяц (Hetzner CX11)
- **База данных:** Бесплатно (MongoDB Atlas Free)
- **Домен:** ~$10/год
- **Итого:** ~$5/месяц

### Оптимальный вариант:
- **VPS:** $12/месяц (DigitalOcean Standard)
- **База данных:** $9/месяц (MongoDB Atlas Shared)
- **Домен:** ~$10/год
- **Итого:** ~$22/месяц

## 🔒 Безопасность

### Обязательные меры:
1. Настройте firewall (UFW)
2. Отключите root доступ по SSH
3. Используйте SSH ключи
4. Регулярно обновляйте систему
5. Настройте автоматические бэкапы

### Firewall настройка:

```bash
# Установите UFW
sudo apt install ufw

# Настройте правила
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Включите firewall
sudo ufw enable
```

## 📊 Мониторинг производительности

### Установите мониторинг:

```bash
# Установите htop для мониторинга ресурсов
apt install htop

# Установите netdata для веб-мониторинга
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

## 🚨 Troubleshooting

### Частые проблемы:

1. **Приложение не запускается:**
   ```bash
   pm2 logs spivanka
   ```

2. **Проблемы с MongoDB:**
   - Проверьте connection string
   - Убедитесь, что IP добавлен в Network Access

3. **Проблемы с SSL:**
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Недостаточно памяти:**
   - Увеличьте RAM на VPS
   - Оптимизируйте приложение 