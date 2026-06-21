import { Injectable, UnauthorizedException, ConflictException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';
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
  ) {}

  // ───────────────────────────
  //  Helper Methods
  // ───────────────────────────

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private async generateAccessToken(userId: number, email: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Store in Redis
    const refreshTtl = Number(this.configService.get<number>('REFRESH_TTL', 604800));
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

    if (existingUser && existingUser.status !== UserStatus.PENDING_VERIFICATION) {
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

    // Generate and send OTP
    const otp = this.generateOtp();
    const otpTtl = Number(this.configService.get<number>('OTP_TTL', 300));
    await this.redisService.set(`${REDIS_KEYS.OTP_VERIFY}${email}`, otp, otpTtl);
    await this.mailService.sendVerificationOtp(email, otp);

    return { message: 'Registration successful. Please verify your email.' };
  }

  // ───────────────────────────
  //  3.2 Verify Email
  // ───────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const { email, otp } = dto;

    // Get OTP from Redis
    const storedOtp = await this.redisService.get(`${REDIS_KEYS.OTP_VERIFY}${email}`);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Update user status
    await this.prisma.user.update({
      where: { email },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    // Remove OTP from Redis
    await this.redisService.del(`${REDIS_KEYS.OTP_VERIFY}${email}`);

    return { message: 'Email verified successfully' };
  }

  // ───────────────────────────
  //  3.3 Resend OTP
  // ───────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const { email } = dto;

    // Only applicable to unverified accounts
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Account not found');
    }
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Account is already verified');
    }

    return this.handleOtpResend(email, 'verify');
  }

  private async handleOtpResend(email: string, type: 'verify' | 'reset') {
    const otpTtl = Number(this.configService.get<number>('OTP_TTL', 300));
    const otpResendCooldown = Number(this.configService.get<number>('OTP_RESEND_COOLDOWN', 60));
    const otpMaxRequests = Number(this.configService.get<number>('OTP_MAX_REQUESTS', 5));
    const otpWindow = Number(this.configService.get<number>('OTP_WINDOW', 3600));

    // Check rate limiting
    const rateLimitKey = `${REDIS_KEYS.OTP_RATE}${email}:${type}`;
    const currentCount = await this.redisService.get(rateLimitKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    if (count >= otpMaxRequests) {
      throw new HttpException('Too many OTP requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Check cooldown
    const lastSentKey = `${rateLimitKey}:last_sent`;
    const lastSent = await this.redisService.get(lastSentKey);
    if (lastSent) {
      const elapsed = Date.now() - parseInt(lastSent, 10);
      if (elapsed < otpResendCooldown * 1000) {
        throw new HttpException('Please wait before requesting a new OTP', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    const prefix = type === 'verify' ? REDIS_KEYS.OTP_VERIFY : REDIS_KEYS.OTP_RESET;
    await this.redisService.set(`${prefix}${email}`, otp, otpTtl);

    // Update rate limit
    if (!currentCount) {
      await this.redisService.set(rateLimitKey, '1', otpWindow);
    } else {
      await this.redisService.incr(rateLimitKey);
      // Ensure TTL is set
      const ttl = await this.redisService.ttl(rateLimitKey);
      if (ttl < 0) {
        await this.redisService.expire(rateLimitKey, otpWindow);
      }
    }

    // Record last sent timestamp
    await this.redisService.set(lastSentKey, Date.now().toString(), otpWindow);

    // Send email
    if (type === 'verify') {
      await this.mailService.sendVerificationOtp(email, otp);
    } else {
      await this.mailService.sendPasswordResetOtp(email, otp);
    }

    return { message: 'OTP sent successfully' };
  }

  // ───────────────────────────
  //  4.1 Login
  // ───────────────────────────

  async login(dto: LoginDto) {
    const { email, password } = dto;

    // Find user
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check status
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new UnauthorizedException('Please verify your email before logging in');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
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
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userId = payload.sub;

      // Check if token exists in Redis
      const storedToken = await this.redisService.get(`${REDIS_KEYS.REFRESH}${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user info for new access token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new access token
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
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a password reset OTP has been sent' };
    }

    return this.handleOtpResend(email, 'reset');
  }

  // ───────────────────────────
  //  7.2 Verify Reset OTP
  // ───────────────────────────

  async verifyResetOtp(dto: VerifyResetOtpDto) {
    const { email, otp } = dto;

    const storedOtp = await this.redisService.get(`${REDIS_KEYS.OTP_RESET}${email}`);

    if (!storedOtp) {
      throw new BadRequestException('OTP has expired or is invalid');
    }

    if (storedOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Mark OTP as verified by keeping a flag
    const otpTtl = Number(this.configService.get<number>('OTP_TTL', 300));
    await this.redisService.set(`${REDIS_KEYS.OTP_RESET}${email}:verified`, 'true', otpTtl);

    return { message: 'OTP verified. You can now reset your password.' };
  }

  // ───────────────────────────
  //  7.3 Reset Password
  // ───────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const { email, newPassword } = dto;

    // Check if OTP was verified
    const isVerified = await this.redisService.get(`${REDIS_KEYS.OTP_RESET}${email}:verified`);
    if (!isVerified) {
      throw new BadRequestException('Please verify the OTP before resetting your password');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user password
    const user = await this.prisma.user.update({
      where: { email },
      data: { passwordHash },
    });

    // Clean up Redis
    await this.redisService.del(`${REDIS_KEYS.OTP_RESET}${email}`);
    await this.redisService.del(`${REDIS_KEYS.OTP_RESET}${email}:verified`);
    await this.redisService.del(`${REDIS_KEYS.REFRESH}${user.id}`);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }
}
