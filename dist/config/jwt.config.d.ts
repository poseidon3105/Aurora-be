import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
export declare const getJwtAccessConfig: (configService: ConfigService) => JwtModuleOptions;
export declare const getJwtRefreshConfig: (configService: ConfigService) => JwtModuleOptions;
