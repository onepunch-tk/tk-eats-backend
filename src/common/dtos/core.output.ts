import { Field, ObjectType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';

@ObjectType()
export class CoreType {
  @Field((type) => String, { nullable: true })
  error?: string;

  @Field((type) => Boolean, { defaultValue: false })
  ok?: boolean;
}

export function CoreOutput<T>(classRef: Type<T>, propName?: string) {
  @ObjectType()
  abstract class ObjectOutput extends CoreType {
    @Field((type) => classRef, { nullable: true, name: propName ?? null })
    result?: T;
  }

  return ObjectOutput;
}
