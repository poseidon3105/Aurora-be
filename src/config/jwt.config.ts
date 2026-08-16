import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export const getJwtAccessConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.getOrThrow<string>('jwt.accessSecret'),
  signOptions: {
    expiresIn: configService.get<string>('jwt.accessExpiresIn', '15m'),
  },
});

export const getJwtRefreshConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.getOrThrow<string>('jwt.refreshSecret'),
  signOptions: {
    expiresIn: configService.get<string>('jwt.refreshExpiresIn', '7d'),
  },
});
