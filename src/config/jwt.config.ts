import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtAccessConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_ACCESS_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
  },
});

export const getJwtRefreshConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get<string>('JWT_REFRESH_SECRET'),
  signOptions: {
    expiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
  },
});
