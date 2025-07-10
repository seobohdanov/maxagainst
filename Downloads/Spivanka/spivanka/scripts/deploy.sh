#!/bin/bash

# Скрипт для деплоя Spivanka на VPS
# Использование: ./scripts/deploy.sh

set -e

echo "🚀 Начинаем деплой Spivanka..."

# Проверяем, что мы в корневой директории проекта
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "⚠️  Предупреждение: .env файл не найден"
    echo "📝 Создайте .env файл на основе env.example"
    cp env.example .env
    echo "✅ Создан .env файл. Отредактируйте его перед деплоем!"
    exit 1
fi

# Проверяем, что ENCRYPTION_KEY установлен
if ! grep -q "ENCRYPTION_KEY=" .env; then
    echo "❌ Ошибка: ENCRYPTION_KEY не найден в .env файле"
    echo "🔐 Сгенерируйте ключ: node scripts/generate-encryption-key.js"
    exit 1
fi

echo "📦 Устанавливаем зависимости..."
npm install --legacy-peer-deps

echo "🔨 Создаем production build..."
npm run build

echo "✅ Сборка завершена успешно!"

echo ""
echo "📋 Следующие шаги для деплоя на VPS:"
echo ""
echo "1. 🖥️  Создайте VPS (рекомендуется Hetzner CX11 или DigitalOcean Basic)"
echo "2. 📝 Настройте домен и укажите A-запись на IP VPS"
echo "3. 🔗 Настройте MongoDB Atlas (бесплатный кластер)"
echo "4. 🚀 Запустите на VPS:"
echo ""
echo "   # Подключитесь к серверу"
echo "   ssh root@your-server-ip"
echo ""
echo "   # Установите необходимые пакеты"
echo "   apt update && apt upgrade -y"
echo "   apt install -y curl wget git nginx certbot python3-certbot-nginx"
echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
echo "   apt install -y nodejs"
echo "   npm install -g pm2"
echo ""
echo "   # Клонируйте репозиторий"
echo "   git clone https://github.com/your-username/spivanka.git"
echo "   cd spivanka"
echo ""
echo "   # Скопируйте .env файл на сервер"
echo "   # Отредактируйте production настройки"
echo ""
echo "   # Запустите приложение"
echo "   npm install"
echo "   npm run build"
echo "   pm2 start npm --name 'spivanka' -- start"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "5. 🌐 Настройте Nginx (см. DEPLOYMENT.md)"
echo "6. 🔒 Установите SSL сертификат"
echo ""
echo "📖 Подробное руководство: DEPLOYMENT.md"
echo "💰 Ожидаемая стоимость: $5-22/месяц"
echo ""
echo "🎉 Удачи с деплоем!" 