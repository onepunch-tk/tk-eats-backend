import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { JwtService } from './jwt.service';
import { UsersService } from '../users/users.service';
import { HEADER_JWT } from '../common/common.constants';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if (HEADER_JWT in req.headers) {
      const token = req.headers[HEADER_JWT];
      const decoded = this.jwtService.verify(token as string);
      if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
        try {
          const {
            result: user,
            ok,
            error,
          } = await this.usersService.findUserById(decoded['id']);
          req['user'] = user;
        } catch (e) {}
      }
    } else {
      console.log('not exist');
    }
    next();
  }
}
