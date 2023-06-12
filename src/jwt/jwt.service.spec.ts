import { Test } from '@nestjs/testing';
import { JwtService } from './jwt.service';
import * as jwt from 'jsonwebtoken';
import { CONFIG_OPTIONS } from '../common/common.constants';

const TEST_KEY = 'test_key';
const USER_ID = 1;
const mockToken = 'TOKEN';
jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => mockToken),
    verify: jest.fn(() => ({
      id: USER_ID,
    })),
  };
});
describe('JwtService', () => {
  let service: JwtService;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: { privateKey: TEST_KEY },
        },
        JwtService,
      ],
    }).compile();
    service = module.get<JwtService>(JwtService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('sign', () => {
    it('should return signed token', () => {
      const result = service.sign(USER_ID);
      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith({ id: USER_ID }, TEST_KEY);
      expect(result).toEqual(expect.any(String));
      expect(result).toEqual(mockToken);
    });
  });
  describe('verify', () => {
    it('should return decoded token', () => {
      const result = service.verify(mockToken);
      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, TEST_KEY);
      expect(result).toMatchObject({ id: USER_ID });
    });
  });
});
