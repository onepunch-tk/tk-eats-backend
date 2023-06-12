import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '../jwt/jwt.service';
import {
  CreateAccountInput,
  EditProfileInput,
  LoginInput,
  LoginOutput,
  UserOutput,
  UserOutputWithObj,
} from './dtos/users.dto';
import { Verification } from './entities/verification.entity';
import { VerifyEmailOutput } from './dtos/verify.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Verification)
    private readonly verifications: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly emailService: MailService,
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<UserOutputWithObj> {
    try {
      //check new user
      if (await this.existsUser(email)) {
        //make error
        return { ok: false, error: 'There is a user with that email already.' };
      }

      //create user & hash the password
      const user = await this.users.save(
        this.users.create({ email, password, role }),
      );
      const verification = await this.verifications.save(
        this.verifications.create({
          user,
        }),
      );
      await this.emailService.sendVerificationEmail(
        user.email,
        verification.code,
      );
      return { ok: true };
    } catch (e) {
      //make error
      return { ok: false, error: "Couldn't create account." };
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      const user = await this.existsUser(email);
      if (!user) {
        //make error
        return { ok: false, error: 'User not found.' };
      }
      const passwordCorrect = await user.comparePassword(password);
      if (!passwordCorrect) {
        return { ok: false, error: 'Wrong password.' };
      }

      const token = this.jwtService.sign(user.id);
      return { ok: true, result: token };
    } catch (e) {
      return { ok: false, error: "Can't log in to server." };
    }
  }
  async editProfile(
    userId: number,
    { email, password }: EditProfileInput,
  ): Promise<UserOutput> {
    try {
      const user = await this.users.findOne({ where: { id: userId } });
      if (email) {
        user.email = email;
        user.verified = false;
        const verification = await this.verifications.save(
          this.verifications.create({ user }),
        );
        await this.emailService.sendVerificationEmail(
          user.email,
          verification.code,
        );
      }
      if (password) {
        user.password = password;
      }
      await this.users.save(user);
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: 'Could not update profile',
      };
    }
  }

  async existsUser(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async findUserById(id: number): Promise<UserOutputWithObj> {
    try {
      const user = await this.users.findOne({ where: { id } });
      if (!user) {
        return {
          ok: false,
          error: 'User not found.',
        };
      }
      return {
        result: user,
        ok: true,
      };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async verifyEmail(code: string): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verifications.findOne({
        where: { code },
        relations: {
          user: true,
        },
        select: {
          user: {
            id: true,
          },
        },
      });
      if (verification) {
        await this.users.update(verification.user.id, { verified: true });
        await this.verifications.delete(verification.id);
        return { ok: true };
      }

      return { ok: false, error: 'Not found verification.' };
    } catch (e) {
      return { ok: false, error: 'Could not verify email.' };
    }
  }
}
