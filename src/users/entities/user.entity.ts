import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
} from 'typeorm';
import { CoreEntity } from '../../common/entities/core.entity';
import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import * as bcrypt from 'bcrypt';
import { InternalServerErrorException } from '@nestjs/common';
import { IsEmail, IsEnum } from 'class-validator';

enum UserRole {
  Client,
  Owner,
  Delivery,
}

registerEnumType(UserRole, { name: 'UserRole' });
@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class User extends CoreEntity {
  @Field((type) => String)
  @Column()
  @Index('IDX_user_email', { unique: true })
  @IsEmail()
  email: string;

  @Field((type) => String)
  @Column()
  password: string;

  @Field((type) => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @Field((type) => Boolean)
  @Column({ default: false })
  verified: boolean;

  private tempPassword: string;
  private tempEmail: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.tempPassword !== this.password) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (e) {
        console.log(e);
        throw new InternalServerErrorException();
      }
    }
  }
  @AfterLoad()
  afterLoadSetVar() {
    this.tempPassword = this.password;
    this.tempEmail = this.email;
  }
  async comparePassword(aPassword: string): Promise<boolean> {
    try {
      return bcrypt.compare(aPassword, this.password);
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException();
    }
  }

  compareEmail(email: string): boolean {
    return this.tempEmail === email;
  }
}
