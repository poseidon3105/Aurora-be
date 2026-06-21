"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtRefreshConfig = exports.getJwtAccessConfig = void 0;
const getJwtAccessConfig = (configService) => ({
    secret: configService.get('JWT_ACCESS_SECRET'),
    signOptions: {
        expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    },
});
exports.getJwtAccessConfig = getJwtAccessConfig;
const getJwtRefreshConfig = (configService) => ({
    secret: configService.get('JWT_REFRESH_SECRET'),
    signOptions: {
        expiresIn: configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    },
});
exports.getJwtRefreshConfig = getJwtRefreshConfig;
//# sourceMappingURL=jwt.config.js.map