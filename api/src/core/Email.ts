import { type Message, type MessageHeaders, SMTPClient } from 'emailjs';
import { $logger } from '../modules/logget';

export class Email {
    static async send(data: Message | MessageHeaders): Promise<boolean> {
        try {
            const client = new SMTPClient({
                user: process.env.SMTP_USERNAME,
                password: process.env.SMTP_PASSWORD,
                host: process.env.SMTP_HOST,
                ssl: process.env.SMTP_ENCRYPTION === 'ssl',
                tls: process.env.SMTP_ENCRYPTION === 'tls',
            });

            await client.sendAsync(data);
            return true;
        } catch (error: any) {
            $logger.error({ errorMessage: error.message, errorStack: error.stack }, 'Can not send email');
            return false;
        }
    }
}
