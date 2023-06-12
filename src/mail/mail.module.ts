import { DynamicModule, Module } from '@nestjs/common';
import { EmailModuleOptions } from './interfaces/email-module.options';
import { CONFIG_OPTIONS, MAILGUN_CLIENT } from '../common/common.constants';
import { MailService } from './mail.service';
import Mailgun from 'mailgun.js';
import * as formData from 'form-data';

@Module({})
export class MailModule {
  static forRoot({
    isGlobal,
    emailOptions,
  }: EmailModuleOptions): DynamicModule {
    return {
      global: isGlobal,
      module: MailModule,
      providers: [
        {
          provide: MAILGUN_CLIENT,
          useValue: new Mailgun(formData).client({
            username: 'api',
            key: emailOptions.apiKey,
          }),
        },
        {
          provide: CONFIG_OPTIONS,
          useValue: emailOptions,
        },
        MailService,
      ],
      exports: [MailService],
    };
  }
}
