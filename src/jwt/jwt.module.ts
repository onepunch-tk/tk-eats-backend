import { DynamicModule, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { CONFIG_OPTIONS } from '../common/common.constants';
import { JwtModuleOptions } from './interfaces/jwt-module.options';

@Module({})
// @Global()
export class JwtModule {
  static forRoot({ isGlobal, jwtOptions }: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      global: isGlobal,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: jwtOptions,
        },
        JwtService,
      ],
      exports: [JwtService],
    };
  }
}
