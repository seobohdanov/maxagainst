import crypto from 'crypto'

// Ключ шифрования должен быть 32 байта (64 hex символа)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0000000000000000000000000000000000000000000000000000000000000000'
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // 16 байт для AES

/**
 * Шифрует текст (только строки)
 */
export function encrypt(text: string): string {
  if (typeof text !== 'string') return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Ошибка шифрования:', error)
    return text // Возвращаем исходный текст в случае ошибки
  }
}

/**
 * Расшифровывает текст (только строки)
 */
export function decrypt(encryptedText: string): string {
  if (typeof encryptedText !== 'string') return encryptedText;
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) return encryptedText
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Ошибка расшифровки:', error)
    return encryptedText // Возвращаем исходный текст в случае ошибки
  }
}

/**
 * Проверяет, зашифрован ли текст (только строки)
 */
export function isEncrypted(text: any): boolean {
  return typeof text === 'string' && text.includes(':') && text.split(':').length === 2
}

/**
 * Безопасно получает значение - расшифровывает если зашифровано
 */
export function getSecureValue(value: any): string {
  if (typeof value !== 'string') return value
  if (isEncrypted(value)) {
    try {
      return decrypt(value)
    } catch {
      return value
    }
  }
  return value
}

/**
 * Безопасно сохраняет значение - шифрует чувствительные данные
 */
export function setSecureValue(value: any, shouldEncrypt: boolean = true): string {
  if (typeof value !== 'string') return value
  if (shouldEncrypt && value.length > 0) {
    return encrypt(value)
  }
  return value
} 