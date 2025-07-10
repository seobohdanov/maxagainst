const crypto = require('crypto');

// Генерируем случайный 32-байтный ключ
const key = crypto.randomBytes(32).toString('hex');

console.log('🔐 Сгенерирован ключ шифрования:');
console.log('');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('');
console.log('📝 Добавьте эту строку в ваш .env.local файл');
console.log('⚠️  ВАЖНО: Храните этот ключ в безопасности!');
console.log('⚠️  Не коммитьте его в git!');
console.log('');
console.log('🔧 Для генерации нового ключа запустите:');
console.log('   node scripts/generate-encryption-key.js'); 