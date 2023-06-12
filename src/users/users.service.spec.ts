import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { JwtService } from '../jwt/jwt.service';
import { MailService } from '../mail/mail.service';
import { Repository } from 'typeorm';

//함수로 지정하는 이유는, user와 verification 레포지토리가 같은 속성을 공유하기때문에, 따로따로 호출하여 각기 다르게 생성
const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const testToken = 'test token';
const mockJwtService = () => ({
  sign: jest.fn((id: number) => testToken),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;
describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: MockRepository<User>;
  let verificationRepository: MockRepository<Verification>;
  let mailService: MailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationRepository = module.get(getRepositoryToken(Verification));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: '',
      password: '',
      role: 0,
    };
    it('should fail if user already exists', async () => {
      //findOne 의 fake data. userservices에서 findOne을 실행시키면 Mock이 가로챈다.
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: '',
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        error: 'There is a user with that email already.',
        ok: false,
      });
    });

    it('should create a new account', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockResolvedValue(createAccountArgs);
      verificationRepository.create.mockReturnValue({
        user: createAccountArgs,
      });
      verificationRepository.save.mockResolvedValue({
        code: 'code',
      });
      const result = await service.createAccount(createAccountArgs);

      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verificationRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });
      expect(verificationRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );

      expect(result).toMatchObject({ ok: true });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error(''));
      try {
        const result = await service.createAccount(createAccountArgs);
        expect(result).toMatchObject({
          ok: false,
          error: 'There is a user with that email already.',
        });
      } catch (e) {}
    });
  });

  describe('login', () => {
    const password = 'password';
    const wrongPassword = 'wrong password';
    const loginArgs = { email: 'test@gmail.com', password };

    it('should fail if not found an user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      const result = await service.login(loginArgs);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: expect.any(String) },
      });
      expect(result).toMatchObject({ ok: false, error: 'User not found.' });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        id: 1,
        comparePassword: jest.fn(
          (aPassword: string) => aPassword === wrongPassword,
        ),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);
      expect(result).toMatchObject({ ok: false, error: 'Wrong password.' });
    });

    it('should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        comparePassword: jest.fn((aPassword: string) => aPassword === password),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.login(loginArgs);

      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(jwtService.sign).toReturnWith(testToken);
      expect(result).toMatchObject({ ok: true, result: testToken });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error(''));
      try {
        const result = await service.login(loginArgs);

        expect(result).toMatchObject({
          ok: false,
          error: "Can't log in to server.",
        });
      } catch (e) {}
    });
  });
  describe('findUserById', () => {
    const id = 1;
    const findUser = {
      id,
      email: 'user@example.com',
    };

    it('should find user by id', async () => {
      usersRepository.findOne.mockResolvedValue(findUser);
      const result = await service.findUserById(id);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toMatchObject({ ok: true, result: findUser });
    });

    it('should fail if not found user by id', async () => {
      usersRepository.findOne.mockReturnValue(null);
      const result = await service.findUserById(id);
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toReturnWith(null);
      expect(result).toMatchObject({
        ok: false,
        error: 'User not found.',
      });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(
        new Error('Not found user from server.'),
      );
      try {
        const result = await service.findUserById(id);
        expect(result).toMatchObject({
          ok: false,
          error: 'Not found user from server.',
        });
      } catch (e) {}
    });
  });
  describe('existsUser', () => {
    const id = 1;
    const findUser = {
      id,
      email: 'user@example.com',
    };

    it('should return user if user exists', async () => {
      usersRepository.findOne.mockResolvedValue(findUser);
      const result = await service.existsUser(findUser.email);
      expect(result).toMatchObject(findUser);
    });

    it('should return user if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.existsUser(findUser.email);
      expect(result).toBeNull();
    });
  });
  describe('editProfile', () => {
    it('should change email', async () => {
      const oldUser = {
        email: 'test@example.com',
        verified: true,
      };
      const editProfileArgs = {
        userId: 1,
        input: {
          email: 'updated@example.com',
        },
      };
      const newVerification = {
        code: 'code',
      };

      const updatedUser = {
        email: editProfileArgs.input.email,
        verified: false,
      };
      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationRepository.create.mockReturnValue({ user: updatedUser });
      verificationRepository.save.mockResolvedValue({
        user: updatedUser,
        code: newVerification.code,
      });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: editProfileArgs.userId },
      });

      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: updatedUser,
      });
      expect(verificationRepository.save).toHaveBeenCalledWith({
        user: updatedUser,
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        updatedUser.email,
        newVerification.code,
      );

      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(updatedUser);

      expect(result).toMatchObject({ ok: true });
    });
    it('should change password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: 'newPassword' },
      };
      const oldUser = {
        password: 'oldPassword',
      };
      usersRepository.findOne.mockResolvedValue(oldUser);
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        ...oldUser,
        password: editProfileArgs.input.password,
      });

      expect(result).toMatchObject({ ok: true });
    });
    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(1, {
        password: 'updatePassword',
        email: 'updateEmail',
      });

      expect(result).toMatchObject({
        ok: false,
        error: 'Could not update profile',
      });
    });
  });
  describe('verifyEmail', () => {
    const mockUser = {
      id: 4,
    };
    const mockVerification = {
      code: 'code',
      id: 7,
    };
    const mockFindOptions = {
      where: { code: mockVerification.code },
      relations: {
        user: true,
      },
      select: {
        user: {
          id: true,
        },
      },
    };

    it('should verify email', async () => {
      verificationRepository.findOne.mockResolvedValue({
        ...mockVerification,
        user: mockUser,
      });
      const result = await service.verifyEmail(mockVerification.code);

      expect(verificationRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationRepository.findOne).toHaveBeenCalledWith(
        mockFindOptions,
      );

      expect(usersRepository.update).toHaveBeenCalledTimes(1);
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        verified: true,
      });

      expect(verificationRepository.delete).toHaveBeenCalledTimes(1);
      expect(verificationRepository.delete).toHaveBeenCalledWith(
        mockVerification.id,
      );

      expect(result).toMatchObject({ ok: true });
    });

    it('should fail if does not exist code', async () => {
      verificationRepository.findOne.mockResolvedValue(null);
      const result = await service.verifyEmail(mockVerification.code);
      expect(verificationRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(verificationRepository.findOne).toHaveBeenCalledWith(
        mockFindOptions,
      );

      expect(result).toMatchObject({
        ok: false,
        error: 'Not found verification.',
      });
    });

    it('should fail on exceptions', async () => {
      verificationRepository.findOne.mockRejectedValue(new Error());
      const result = await service.verifyEmail(mockVerification.code);
      expect(result).toMatchObject({
        ok: false,
        error: 'Could not verify email.',
      });
    });
  });
});
