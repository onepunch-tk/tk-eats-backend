import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS, MAILGUN_CLIENT } from '../common/common.constants';
import { Interfaces } from 'mailgun.js';
import { EmailOptions } from './interfaces/email-module.options';
import { EmailVariable } from './interfaces/mail.variable';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAILGUN_CLIENT) private readonly mg: Interfaces.IMailgunClient,
    @Inject(CONFIG_OPTIONS) private readonly options: EmailOptions,
  ) {}

  async sendEmail(
    subject: string,
    template: string,
    emailVar: EmailVariable,
    ...to: string[]
  ) {
    try {
      const result = await this.mg.messages.create(this.options.domain, {
        from: `tk.dev from TK Eats <mailgun@${this.options.domain}>`,
        to,
        subject,
        template,
        'h:X-Mailgun-Variables': JSON.stringify(emailVar),
      });
      return result.status === 200;
    } catch (e) {
      return false;
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    await this.sendEmail(
      'Verify Your Email',
      'tk-eats',
      {
        username: email,
        code,
      },
      email,
    );
  }
}
