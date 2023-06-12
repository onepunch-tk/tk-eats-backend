import { InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreType } from '../../common/dtos/core.output';
import { Verification } from '../entities/verification.entity';

@ObjectType()
export class VerifyEmailOutput extends CoreType {}

@InputType()
export class VerifyEmailInput extends PickType(Verification, ['code']) {}
