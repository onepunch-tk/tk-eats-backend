import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HEADER_JWT } from '../src/common/common.constants';
import { Verification } from '../src/users/entities/verification.entity';

jest.mock('mailgun.js', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        client: jest.fn().mockImplementation(() => {
          return {
            messages: {
              create: jest.fn(() => ({
                status: 200,
              })),
            },
          };
        }),
      };
    }),
  };
});
const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: '86tkstar@gmail.com',
  password: 'testPassword',
};

describe('UsersModule (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;
  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set(HEADER_JWT, jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('createAccount', () => {
    it('should create a new account', () => {
      return publicTest(
        'mutation {\n' +
          '  createAccount(input: {\n' +
          `    email:"${testUser.email}",\n` +
          `    password:"${testUser.password}",\n` +
          '    role:Owner\n' +
          '  }){\n' +
          '    error\n' +
          '    ok\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });
    it('should fail if account already exists', () => {
      return publicTest(
        'mutation {\n' +
          '  createAccount(input: {\n' +
          `    email:"${testUser.email}",\n` +
          `    password:"${testUser.password}",\n` +
          '    role:Owner\n' +
          '  }){\n' +
          '    error\n' +
          '    ok\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(typeof res.body.data.createAccount.error).toBe('string');
          expect(res.body.data.createAccount.error).toBe(
            'There is a user with that email already.',
          );
        });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return publicTest(
        'mutation{\n' +
          '  login(input:{\n' +
          `    email:"${testUser.email}",\n` +
          `    password:"${testUser.password}",\n` +
          '  }){\n' +
          '    ok\n' +
          '    error\n' +
          '    token\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(true);
          expect(login.error).toBe(null);
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });
    it('should not be able to login with wrong credentials', () => {
      return publicTest(
        'mutation{\n' +
          '  login(input:{\n' +
          `    email:"${testUser.email}",\n` +
          `    password:"wrongPassword",\n` +
          '  }){\n' +
          '    ok\n' +
          '    error\n' +
          '    token\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBe(false);
          expect(login.error).toEqual(expect.any(String));
          expect(login.error).toEqual('Wrong password.');
          expect(login.token).toBeNull();
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });
    it("should see a user's profile", () => {
      return privateTest(
        '{\n' +
          ` userProfile(id:${userId}){\n` +
          '    ok\n' +
          '    error\n' +
          '    user{\n' +
          '      id\n' +
          '      email\n' +
          '    }\n' +
          '  }' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, user, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBeNull();
          expect(user.id).toEqual(userId);
        });
    });
    it('should not found a profile', () => {
      return privateTest(
        '{\n' +
          ` userProfile(id:999){\n` +
          '    ok\n' +
          '    error\n' +
          '    user{\n' +
          '      id\n' +
          '      email\n' +
          '    }\n' +
          '  }' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, user, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toEqual('User not found.');
          expect(user).toBeNull();
        });
    });
  });

  describe('me', () => {
    it('should find my profile', () => {
      return privateTest('{\n' + '  me{\n' + '    email\n' + '  }\n' + '}')
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toEqual(testUser.email);
        });
    });
    it('should not allow logged out user', () => {
      return publicTest('{\n' + '  me{\n' + '    email\n' + '  }\n' + '}')
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toEqual('Forbidden resource');
        });
    });
  });
  describe('editProfile', () => {
    const NEW_EMAIL = 'update@gmail.com';
    it('should update the email', () => {
      return privateTest(
        'mutation {\n' +
          '  editProfile(input:{\n' +
          `    email:"${NEW_EMAIL}"\n` +
          '  }) {\n' +
          '    ok\n' +
          '    error\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBeNull();
        });
    });
    it('should have new email', () => {
      return privateTest('{\n' + '  me{\n' + '    email\n' + '  }\n' + '}')
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toEqual(NEW_EMAIL);
        });
    });
  });

  describe('verifyEmail', () => {
    let code: string;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find();
      code = verification.code;
    });

    it('should verify email', () => {
      return publicTest(
        'mutation {\n' +
          '  verifyEmail(input:{\n' +
          `    code:"${code}"\n` +
          '  }) {\n' +
          '    ok\n' +
          '    error\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBeNull();
        });
    });

    it('should fail if wrong verification code', () => {
      return publicTest(
        'mutation {\n' +
          '  verifyEmail(input:{\n' +
          `    code:"${code}"\n` +
          '  }) {\n' +
          '    ok\n' +
          '    error\n' +
          '  }\n' +
          '}',
      )
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toEqual('Not found verification.');
        });
    });
  });
});
