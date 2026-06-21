"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const redis_service_1 = require("../../redis/redis.service");
const mail_service_1 = require("../../mail/mail.service");
const client_1 = require("@prisma/client");
const auth_constants_1 = require("./auth.constants");
let AuthService = class AuthService {
    constructor(prisma, jwtService, configService, redisService, mailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
        this.redisService = redisService;
        this.mailService = mailService;
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    async generateAccessToken(userId, email) {
        return this.jwtService.signAsync({ sub: userId, email }, {
            secret: this.configService.get('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
        });
    }
    async generateRefreshToken(userId) {
        const refreshToken = await this.jwtService.signAsync({ sub: userId, type: 'refresh' }, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        });
        const refreshTtl = Number(this.configService.get('REFRESH_TTL', 604800));
        await this.redisService.set(`${auth_constants_1.REDIS_KEYS.REFRESH}${userId}`, refreshToken, refreshTtl);
        return refreshToken;
    }
    async register(dto) {
        const { email, password, fullName } = dto;
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.status !== client_1.UserStatus.PENDING_VERIFICATION) {
            throw new common_1.ConflictException('Email already exists');
        }
        if (existingUser && existingUser.status === client_1.UserStatus.PENDING_VERIFICATION) {
            await this.handleOtpResend(email, 'verify');
            return { message: 'OTP resent to email' };
        }
        const passwordHash = await this.hashPassword(password);
        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                status: client_1.UserStatus.PENDING_VERIFICATION,
            },
        });
        const userRole = await this.prisma.systemRole.findUnique({ where: { name: 'USER' } });
        if (userRole) {
            await this.prisma.userSystemRole.create({
                data: {
                    userId: user.id,
                    roleId: userRole.id,
                },
            });
        }
        const otp = this.generateOtp();
        const otpTtl = Number(this.configService.get('OTP_TTL', 300));
        await this.redisService.set(`${auth_constants_1.REDIS_KEYS.OTP_VERIFY}${email}`, otp, otpTtl);
        await this.mailService.sendVerificationOtp(email, otp);
        return { message: 'Registration successful. Please verify your email.' };
    }
    async verifyEmail(dto) {
        const { email, otp } = dto;
        const storedOtp = await this.redisService.get(`${auth_constants_1.REDIS_KEYS.OTP_VERIFY}${email}`);
        if (!storedOtp) {
            throw new common_1.BadRequestException('OTP has expired or is invalid');
        }
        if (storedOtp !== otp) {
            throw new common_1.BadRequestException('Invalid OTP');
        }
        await this.prisma.user.update({
            where: { email },
            data: {
                status: client_1.UserStatus.ACTIVE,
            },
        });
        await this.redisService.del(`${auth_constants_1.REDIS_KEYS.OTP_VERIFY}${email}`);
        return { message: 'Email verified successfully' };
    }
    async resendOtp(dto) {
        const { email } = dto;
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.BadRequestException('Account not found');
        }
        if (user.status !== client_1.UserStatus.PENDING_VERIFICATION) {
            throw new common_1.BadRequestException('Account is already verified');
        }
        return this.handleOtpResend(email, 'verify');
    }
    async handleOtpResend(email, type) {
        const otpTtl = Number(this.configService.get('OTP_TTL', 300));
        const otpResendCooldown = Number(this.configService.get('OTP_RESEND_COOLDOWN', 60));
        const otpMaxRequests = Number(this.configService.get('OTP_MAX_REQUESTS', 5));
        const otpWindow = Number(this.configService.get('OTP_WINDOW', 3600));
        const rateLimitKey = `${auth_constants_1.REDIS_KEYS.OTP_RATE}${email}:${type}`;
        const currentCount = await this.redisService.get(rateLimitKey);
        const count = currentCount ? parseInt(currentCount, 10) : 0;
        if (count >= otpMaxRequests) {
            throw new common_1.HttpException('Too many OTP requests. Please try again later.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const lastSentKey = `${rateLimitKey}:last_sent`;
        const lastSent = await this.redisService.get(lastSentKey);
        if (lastSent) {
            const elapsed = Date.now() - parseInt(lastSent, 10);
            if (elapsed < otpResendCooldown * 1000) {
                throw new common_1.HttpException('Please wait before requesting a new OTP', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
        }
        const otp = this.generateOtp();
        const prefix = type === 'verify' ? auth_constants_1.REDIS_KEYS.OTP_VERIFY : auth_constants_1.REDIS_KEYS.OTP_RESET;
        await this.redisService.set(`${prefix}${email}`, otp, otpTtl);
        if (!currentCount) {
            await this.redisService.set(rateLimitKey, '1', otpWindow);
        }
        else {
            await this.redisService.incr(rateLimitKey);
            const ttl = await this.redisService.ttl(rateLimitKey);
            if (ttl < 0) {
                await this.redisService.expire(rateLimitKey, otpWindow);
            }
        }
        await this.redisService.set(lastSentKey, Date.now().toString(), otpWindow);
        if (type === 'verify') {
            await this.mailService.sendVerificationOtp(email, otp);
        }
        else {
            await this.mailService.sendPasswordResetOtp(email, otp);
        }
        return { message: 'OTP sent successfully' };
    }
    async login(dto) {
        const { email, password } = dto;
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (user.status === client_1.UserStatus.PENDING_VERIFICATION) {
            throw new common_1.UnauthorizedException('Please verify your email before logging in');
        }
        if (user.status !== client_1.UserStatus.ACTIVE) {
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        const isPasswordValid = await this.comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const accessToken = await this.generateAccessToken(user.id, user.email);
        const refreshToken = await this.generateRefreshToken(user.id);
        return { accessToken, refreshToken };
    }
    async refreshToken(dto) {
        const { refreshToken } = dto;
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
            });
            const userId = payload.sub;
            const storedToken = await this.redisService.get(`${auth_constants_1.REDIS_KEYS.REFRESH}${userId}`);
            if (!storedToken || storedToken !== refreshToken) {
                throw new common_1.UnauthorizedException('Invalid refresh token');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const accessToken = await this.generateAccessToken(user.id, user.email);
            return { accessToken };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
    }
    async logout(userId) {
        await this.redisService.del(`${auth_constants_1.REDIS_KEYS.REFRESH}${userId}`);
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(dto) {
        const { email } = dto;
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'If the email exists, a password reset OTP has been sent' };
        }
        return this.handleOtpResend(email, 'reset');
    }
    async verifyResetOtp(dto) {
        const { email, otp } = dto;
        const storedOtp = await this.redisService.get(`${auth_constants_1.REDIS_KEYS.OTP_RESET}${email}`);
        if (!storedOtp) {
            throw new common_1.BadRequestException('OTP has expired or is invalid');
        }
        if (storedOtp !== otp) {
            throw new common_1.BadRequestException('Invalid OTP');
        }
        const otpTtl = Number(this.configService.get('OTP_TTL', 300));
        await this.redisService.set(`${auth_constants_1.REDIS_KEYS.OTP_RESET}${email}:verified`, 'true', otpTtl);
        return { message: 'OTP verified. You can now reset your password.' };
    }
    async resetPassword(dto) {
        const { email, newPassword } = dto;
        const isVerified = await this.redisService.get(`${auth_constants_1.REDIS_KEYS.OTP_RESET}${email}:verified`);
        if (!isVerified) {
            throw new common_1.BadRequestException('Please verify the OTP before resetting your password');
        }
        const passwordHash = await this.hashPassword(newPassword);
        const user = await this.prisma.user.update({
            where: { email },
            data: { passwordHash },
        });
        await this.redisService.del(`${auth_constants_1.REDIS_KEYS.OTP_RESET}${email}`);
        await this.redisService.del(`${auth_constants_1.REDIS_KEYS.OTP_RESET}${email}:verified`);
        await this.redisService.del(`${auth_constants_1.REDIS_KEYS.REFRESH}${user.id}`);
        return { message: 'Password reset successfully. Please log in with your new password.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        redis_service_1.RedisService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map