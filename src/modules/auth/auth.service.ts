import { Injectable, UnauthorizedException, ConflictException, BadRequestException, HttpException, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { OAuth2Client } from 'google-auth-library';
import { randomInt } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserStatus } from '@prisma/client';
import { REDIS_KEYS } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ───────────────────────────
  //  Helper Methods
  // ───────────────────────────

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private getOtpConfig() {
    return {
      ttl: this.configService.get<number>('otp.ttl', 300),
      resendCooldown: this.configService.get<number>('otp.resendCooldown', 60),
      maxRequests: this.configService.get<number>('otp.maxRequests', 5),
      window: this.configService.get<number>('otp.window', 3600),
      maxAttempts: this.configService.get<number>('otp.maxAttempts', 10),
    };
  }

  private async consumeOtpAttempt(
    email: string,
    type: 'verify' | 'reset',
    otpKey: string,
  ): Promise<string> {
    const { ttl, maxAttempts } = this.getOtpConfig();
    const attemptKey = `${REDIS_KEYS.OTP_ATTEMPTS}${email}:${type}`;
    const attempts = await this.redisService.incrementWithExpiry(attemptKey, ttl);

    if (attempts > maxAttempts) {
      await this.redisService.del(otpKey);
      throw new HttpException(
        'Too many invalid OTP attempts. Please request a new OTP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return attemptKey;
  }

  private async generateAccessToken(userId: number, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m'),
      },
    );
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn', '7d'),
      },
    );

    // Store in Redis
    const refreshTtl = this.configService.get<number>('refresh.ttl', 604800);
    await this.redisService.set(
      `${REDIS_KEYS.REFRESH}${userId}`,
      refreshToken,
      refreshTtl,
    );

    return refreshToken;
  }

  // ───────────────────────────
  //  3.1 Register Account
  // ───────────────────────────

  async register(dto: RegisterDto) {
    const { email, password, fullName } = dto;

    // Check if existing active user
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (
      existingUser &&
      (existingUser.deletedAt || existingUser.status !== UserStatus.PENDING_VERIFICATION)
    ) {
      throw new ConflictException('Email already exists');
    }

    // If PENDING_VERIFICATION exists, resend OTP instead
    if (existingUser && existingUser.status === UserStatus.PENDING_VERIFICATION) {
      await this.handleOtpResend(email, 'verify');
      return { message: 'OTP resent to email' };
    }

    // Create new user
    const passwordHash = await this.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    // Assign USER system role
    const userRole = await this.prisma.systemRole.findUnique({ where: { name: 'USER' } });
    if (userRole) {
      await this.prisma.userSystemRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });
    }

    // Send the initial OTP through the same atomic rate-limit path as resends.
    await this.handleOtpResend(email, 'verify');

    // Activity Log: REGISTER
    await this.activityLogService.create(
      user.id,
      'REGISTER',
      'USER',
      user.id,
    ).catch(() => {});

    return { message: 'Registration successful. Please verify your email.' };
  }

  // ───────────────────────────
  //  3.2 Verify Email
  // ───────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const { email, otp } = dto;
    const otpKey = `${REDIS_KEYS.OTP_VERIFY}${email}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { deletedAt: true, status: true },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.PENDING_VERIFICATION
    ) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    const attemptKey = await this.consumeOtpAttempt(email, 'verify', otpKey);
    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { email },
      data: { status: UserStatus.ACTIVE },
    });

    await this.redisService.del(otpKey);
    await this.redisService.del(attemptKey);

    return { message: 'Email verified successfully' };
  }
  // ───────────────────────────
  //  3.3 Resend OTP
  // ───────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.PENDING_VERIFICATION
    ) {
      throw new BadRequestException('Account is unavailable for verification');
    }

    return this.handleOtpResend(email, 'verify');
  }
  private async handleOtpResend(email: string, type: 'verify' | 'reset') {
    const { ttl, resendCooldown, maxRequests, window } = this.getOtpConfig();
    const rateLimitKey = `${REDIS_KEYS.OTP_RATE}${email}:${type}`;
    const allowance = await this.redisService.consumeOtpSendAllowance(
      rateLimitKey,
      `${rateLimitKey}:last_sent`,
      maxRequests,
      window,
      resendCooldown,
    );

    if (allowance === 'cooldown') {
      throw new HttpException(
        'Please wait before requesting a new OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (allowance === 'rate_limited') {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = this.generateOtp();
    const prefix = type === 'verify' ? REDIS_KEYS.OTP_VERIFY : REDIS_KEYS.OTP_RESET;
    await this.redisService.set(`${prefix}${email}`, otp, ttl);
    await this.redisService.del(`${REDIS_KEYS.OTP_ATTEMPTS}${email}:${type}`);

    if (type === 'verify') {
      await this.mailService.sendVerificationOtp(email, otp);
    } else {
      await this.mailService.sendPasswordResetOtp(email, otp);
    }

    return { message: 'OTP sent successfully' };
  }
  // ───────────────────────────
  //  3.5 Google Login
  // ───────────────────────────

  async googleLogin(idToken: string) {
    const clientId = this.configService.get<string>('google.clientId');
    if (!clientId) {
      throw new InternalServerErrorException('Google authentication is not configured');
    }

    let payload: {
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    try {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload() as typeof payload;
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const { email, name, picture } = payload;
    if (!email || payload.email_verified !== true) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      if (user.deletedAt || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is inactive or has been deleted');
      }
      if (user.passwordHash) {
        throw new ConflictException(
          'An account with this email already exists. Please log in with your email and password.',
        );
      }
    } else {
      const displayName = name || email.split('@')[0];
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: displayName,
          avatarUrl: picture || null,
          status: UserStatus.ACTIVE,
        },
      });

      const userRole = await this.prisma.systemRole.findUnique({
        where: { name: 'USER' },
      });
      if (userRole) {
        await this.prisma.userSystemRole.create({
          data: {
            userId: user.id,
            roleId: userRole.id,
          },
        });
      }

      await this.activityLogService
        .create(user.id, 'REGISTER', 'USER', user.id)
        .catch(() => {});
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }
  // ───────────────────────────
  //  4.1 Login
  // ───────────────────────────

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.deletedAt || user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Account is inactive or has been deleted');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }
  // ───────────────────────────
  //  5.1 Refresh Access Token
  // ───────────────────────────

  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      });
      const userId = Number(payload.sub);

      if (
        payload.type !== 'refresh' ||
        !Number.isSafeInteger(userId) ||
        userId <= 0
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const storedToken = await this.redisService.get(
        `${REDIS_KEYS.REFRESH}${userId}`,
      );
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, status: true, deletedAt: true },
      });
      if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
        await this.redisService.del(`${REDIS_KEYS.REFRESH}${userId}`);
        throw new UnauthorizedException('Account is inactive or has been deleted');
      }

      const accessToken = await this.generateAccessToken(user.id, user.email);
      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
  // ───────────────────────────
  //  6.1 Logout
  // ───────────────────────────

  async logout(userId: number) {
    await this.redisService.del(`${REDIS_KEYS.REFRESH}${userId}`);

    return { message: 'Logged out successfully' };
  }

  // ───────────────────────────
  //  7.1 Forgot Password
  // ───────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message = 'If the email exists, a password reset OTP has been sent';

    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      !user.passwordHash
    ) {
      return { message };
    }

    try {
      await this.handleOtpResend(email, 'reset');
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        return { message };
      }
      throw error;
    }

    return { message };
  }
  // ───────────────────────────
  //  7.2 Verify Reset OTP
  // ───────────────────────────

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const { email, otp } = dto;
    const otpKey = `${REDIS_KEYS.OTP_RESET}${email}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    const attemptKey = await this.consumeOtpAttempt(email, 'reset', otpKey);
    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    const otpTtl = this.getOtpConfig().ttl;
    await this.redisService.set(`${otpKey}:verified`, 'true', otpTtl);
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptKey);

    return { message: 'OTP verified. You can now reset your password.' };
  }
  // ───────────────────────────
  //  7.3 Reset Password
  // ───────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const { email, newPassword } = dto;
    const verifiedKey = `${REDIS_KEYS.OTP_RESET}${email}:verified`;
    const isVerified = await this.redisService.get(verifiedKey);

    if (!isVerified) {
      throw new BadRequestException('Please verify the OTP before resetting your password');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      user.deletedAt ||
      user.status !== UserStatus.ACTIVE ||
      !user.passwordHash
    ) {
      throw new BadRequestException('Password reset is not available for this account');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await this.redisService.del(`${REDIS_KEYS.OTP_RESET}${email}`);
    await this.redisService.del(verifiedKey);
    await this.redisService.del(`${REDIS_KEYS.OTP_ATTEMPTS}${email}:reset`);
    await this.redisService.del(`${REDIS_KEYS.REFRESH}${user.id}`);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
