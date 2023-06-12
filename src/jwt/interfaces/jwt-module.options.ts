import { ModuleOptions } from '../../common/interfaces/common-module.options';

export interface JwtOptions {
  privateKey: string;
}
export interface JwtModuleOptions extends ModuleOptions {
  jwtOptions: JwtOptions;
}
