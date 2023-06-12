import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import {
  CreateAccountInput,
  EditProfileInput,
  LoginInput,
  LoginOutput,
  UserOutput,
  UserOutputWithObj,
} from './dtos/users.dto';
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify.dto';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly _userService: UsersService) {}

  @Query((returns) => User)
  @UseGuards(AuthGuard)
  me(@AuthUser() authUser: User) {
    return authUser;
  }

  @UseGuards(AuthGuard)
  @Query((returns) => UserOutputWithObj)
  userProfile(@Args('id') id: number) {
    return this._userService.findUserById(id);
  }

  @Mutation((returns) => UserOutputWithObj)
  async createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<UserOutputWithObj> {
    return this._userService.createAccount(createAccountInput);
  }

  @Mutation((returns) => LoginOutput)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    return this._userService.login(loginInput);
  }

  @UseGuards(AuthGuard)
  @Mutation((returns) => UserOutput)
  async editProfile(
    @AuthUser() authUser: User,
    @Args('input') editProfileDto: EditProfileInput,
  ): Promise<UserOutput> {
    return this._userService.editProfile(authUser.id, editProfileDto);
  }

  @Mutation((returns) => VerifyEmailOutput)
  async verifyEmail(@Args('input') verifyInput: VerifyEmailInput) {
    return this._userService.verifyEmail(verifyInput.code);
  }
}
