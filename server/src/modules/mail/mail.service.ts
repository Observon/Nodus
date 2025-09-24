import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
    auth: (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const from = 'no-reply@nodus.local';
    const info = await this.transporter.sendMail({ from, to, subject, text, html });
    this.logger.log(`Email enviado: ${info.messageId}`);
    return info;
  }
}
