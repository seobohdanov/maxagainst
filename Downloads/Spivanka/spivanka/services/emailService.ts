import nodemailer from 'nodemailer'
import clientPromise from '@/lib/mongodb'
import crypto from 'crypto'

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface EmailRecipient {
  email: string
  name?: string
  unsubscribeToken?: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      // DKIM настройки
      dkim: {
        domainName: process.env.DOMAIN_NAME,
        keySelector: process.env.DKIM_SELECTOR,
        privateKey: process.env.DKIM_PRIVATE_KEY
      }
    })
  }

  /**
   * Проверяет согласие пользователя на маркетинговые письма
   */
  async checkMarketingConsent(email: string): Promise<boolean> {
    try {
      const client = await clientPromise
      const db = client.db()
      const consentCollection = db.collection('user_consents')

      const consent = await consentCollection.findOne({ 
        email: email.toLowerCase(),
        'marketingConsent.agreed': true 
      })

      return !!consent
    } catch (error) {
      console.error('❌ Помилка перевірки згоди на маркетинг:', error)
      return false
    }
  }

  /**
   * Получает список пользователей с согласием на маркетинг
   */
  async getMarketingConsentUsers(): Promise<EmailRecipient[]> {
    try {
      const client = await clientPromise
      const db = client.db()
      const consentCollection = db.collection('user_consents')

      const consents = await consentCollection.find({
        'marketingConsent.agreed': true,
        email: { $ne: null }
      }).toArray()

      return consents.map(consent => ({
        email: consent.email,
        unsubscribeToken: this.generateUnsubscribeToken(consent.email)
      }))
    } catch (error) {
      console.error('❌ Помилка отримання користувачів з маркетинговою згодою:', error)
      return []
    }
  }

  /**
   * Генерирует токен для отписки
   */
  private generateUnsubscribeToken(email: string): string {
    return crypto.createHash('sha256')
      .update(email + (process.env.UNSUBSCRIBE_SECRET || ''))
      .digest('hex')
  }

  /**
   * Отправляет маркетинговое письмо с проверкой согласия
   */
  async sendMarketingEmail(template: EmailTemplate, recipients: EmailRecipient[]) {
    const validRecipients = []

    for (const recipient of recipients) {
      // Проверяем согласие перед отправкой
      const hasConsent = await this.checkMarketingConsent(recipient.email)
      
      if (hasConsent) {
        validRecipients.push(recipient)
      } else {
        console.log(`⚠️ Пропускаю ${recipient.email} - немає згоди на маркетинг`)
      }
    }

    if (validRecipients.length === 0) {
      console.log('⚠️ Немає валідних отримувачів для розсилки')
      return { success: false, message: 'Немає валідних отримувачів' }
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    for (const recipient of validRecipients) {
      try {
        const emailHtml = this.addUnsubscribeLink(template.html, recipient.unsubscribeToken)
        const emailText = this.addUnsubscribeLink(template.text, recipient.unsubscribeToken)

        await this.transporter.sendMail({
          from: `"Spivanka" <${process.env.FROM_EMAIL}>`,
          to: recipient.email,
          subject: template.subject,
          html: emailHtml,
          text: emailText,
          // Headers для предотвращения спама
          headers: {
            'List-Unsubscribe': `<${process.env.DOMAIN_NAME}/unsubscribe?token=${recipient.unsubscribeToken}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
            'X-Auto-Response-Suppress': 'OOF, AutoReply'
          }
        })

        successCount++
        results.push({ email: recipient.email, status: 'sent' })
        
        // Логируем отправку
        await this.logEmailSent(recipient.email, 'marketing')
        
      } catch (error) {
        errorCount++
                 results.push({ email: recipient.email, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' })
         console.error(`❌ Помилка відправки на ${recipient.email}:`, error)
      }

      // Пауза между отправками для предотвращения спама
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      success: true,
      total: validRecipients.length,
      sent: successCount,
      errors: errorCount,
      results
    }
  }

  /**
   * Добавляет ссылку отписки в письмо
   */
  private addUnsubscribeLink(content: string, token: string): string {
    const unsubscribeHtml = `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
        <p>Це письмо надіслано користувачам, які погодилися отримувати маркетингові матеріали від Spivanka.</p>
        <p>
          <a href="${process.env.DOMAIN_NAME}/unsubscribe?token=${token}" style="color: #666;">
            Відписатися від розсилки
          </a>
        </p>
      </div>
    `

    const unsubscribeText = `
      
      Це письмо надіслано користувачам, які погодилися отримувати маркетингові матеріали від Spivanka.
      Для відписки перейдіть за посиланням: ${process.env.DOMAIN_NAME}/unsubscribe?token=${token}
    `

    if (content.includes('</body>')) {
      return content.replace('</body>', `${unsubscribeHtml}</body>`)
    } else {
      return content + unsubscribeText
    }
  }

  /**
   * Логирует отправку письма
   */
  private async logEmailSent(email: string, type: string) {
    try {
      const client = await clientPromise
      const db = client.db()
      const emailLogCollection = db.collection('email_logs')

      await emailLogCollection.insertOne({
        email: email.toLowerCase(),
        type,
        sentAt: new Date(),
        ipAddress: 'system'
      })
    } catch (error) {
      console.error('❌ Помилка логування email:', error)
    }
  }

  /**
   * Отписывает пользователя от рассылки
   */
  async unsubscribeUser(token: string): Promise<boolean> {
    try {
      const client = await clientPromise
      const db = client.db()
      const consentCollection = db.collection('user_consents')

      // Находим пользователя по токену
      const consents = await consentCollection.find({
        'marketingConsent.agreed': true
      }).toArray()

      const user = consents.find(consent => 
        this.generateUnsubscribeToken(consent.email) === token
      )

      if (!user) {
        return false
      }

      // Отзываем маркетинговое согласие
      await consentCollection.updateOne(
        { email: user.email },
        { 
          $set: {
            'marketingConsent.agreed': false,
            'marketingConsent.withdrawnAt': new Date(),
            updatedAt: new Date()
          }
        }
      )

      console.log(`✅ Користувач ${user.email} відписався від розсилки`)
      return true

    } catch (error) {
      console.error('❌ Помилка відписки користувача:', error)
      return false
    }
  }

  /**
   * Отправляет транзакционное письмо (без проверки согласия)
   */
  async sendTransactionalEmail(to: string, template: EmailTemplate) {
    try {
      await this.transporter.sendMail({
        from: `"Spivanka" <${process.env.FROM_EMAIL}>`,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text
      })

      await this.logEmailSent(to, 'transactional')
      return { success: true }

    } catch (error) {
      console.error('❌ Помилка відправки транзакційного email:', error)
      return { success: false, error: error.message }
    }
  }
}

export const emailService = new EmailService() 