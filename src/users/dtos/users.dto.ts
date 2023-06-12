import {
  InputType,
  ObjectType,
  OmitType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { User } from '../entities/user.entity';
import { CoreOutput, CoreType } from '../../common/dtos/core.output';

@InputType()
export class CreateAccountInput extends PickType(User, [
  'email',
  'password',
  'role',
]) {}

@ObjectType()
export class UserOutput extends CoreType {}
@ObjectType()
export class UserOutputWithObj extends CoreOutput(
  OmitType(User, ['password'], () => ObjectType('UserOutputType')),
  'user',
) {}

@InputType()
export class LoginInput extends PickType(User, ['email', 'password']) {}

@ObjectType()
export class LoginOutput extends CoreOutput(String, 'token') {}

@InputType()
export class EditProfileInput extends PartialType(
  PickType(User, ['email', 'password']),
) {}
