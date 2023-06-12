import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { CONFIG_OPTIONS, MAILGUN_CLIENT } from '../common/common.constants';
import { Interfaces } from 'mailgun.js';

const TEST_DOMAIN = 'test_domain';
describe('MailService', () => {
  let service: MailService;
  let mailgunClient: Interfaces.IMailgunClient;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: MAILGUN_CLIENT,
          useValue: {
            messages: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            domain: TEST_DOMAIN,
          },
        },
        MailService,
      ],
    }).compile();
    service = module.get<MailService>(MailService);
    mailgunClient = module.get(MAILGUN_CLIENT);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    const mockSendEmailArgs = {
      subject: 'test_subject',
      template: 'test_template',
      emailVar: { username: 'test_user' },
      to: 'test_to_email',
    };

    it('should success send email on mailgun', async () => {
      const mailgunClientSpy = jest.spyOn(mailgunClient.messages, 'create');
      mailgunClientSpy.mockResolvedValue({ status: 200 });

      const result = await service.sendEmail(
        mockSendEmailArgs.subject,
        mockSendEmailArgs.template,
        mockSendEmailArgs.emailVar,
        mockSendEmailArgs.to,
      );

      expect(mailgunClientSpy).toHaveBeenCalledTimes(1);
      expect(mailgunClientSpy).toHaveBeenCalledWith(TEST_DOMAIN, {
        from: `tk.dev from TK Eats <mailgun@${TEST_DOMAIN}>`,
        to: [mockSendEmailArgs.to],
        subject: mockSendEmailArgs.subject,
        template: mockSendEmailArgs.template,
        'h:X-Mailgun-Variables': JSON.stringify(mockSendEmailArgs.emailVar),
      });

      expect(result).toEqual(true);
    });

    it('should fail send email on mailgun', async () => {
      const mailgunClientSpy = jest.spyOn(mailgunClient.messages, 'create');
      mailgunClientSpy.mockResolvedValue({ status: 400 });

      const result = await service.sendEmail('', '', {});
      expect(result).toEqual(false);
    });

    it('should fail on exception', async () => {
      jest
        .spyOn(mailgunClient.messages, 'create')
        .mockImplementation(async () => {
          throw new Error();
        });

      const result = await service.sendEmail('', '', {});
      expect(result).toEqual(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verify email', async () => {
      const email = 'email';
      const code = 'code';
      jest.spyOn(service, 'sendEmail');
      await service.sendVerificationEmail(email, code);
      expect(service.sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        {
          username: email,
          code,
        },
        email,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
    });
  });
});
