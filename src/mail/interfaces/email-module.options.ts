import { ModuleOptions } from '../../common/interfaces/common-module.options';

export interface EmailOptions {
  apiKey: string;
  domain: string;
  fromEmail: string;
}
export interface EmailModuleOptions extends ModuleOptions {
  emailOptions: EmailOptions;
}
